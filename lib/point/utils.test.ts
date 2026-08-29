/**
 * @design_doc   Point utility unit tests
 * @related_to   lib/point/utils.ts
 * @known_issues None currently
 */
import { describe, it, expect, vi } from 'vitest'
import {
  addPointTransaction,
  calculateEarnedPoints,
  calculateExpiryDate,
  resolvePointConfig,
  syncReservationPointUsage,
} from './utils'

describe('addPointTransaction', () => {
  it('deducts points with a conditional atomic update before recording the resulting balance', async () => {
    const tx = {
      customer: {
        findUnique: vi.fn().mockResolvedValue({ points: 300 }),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      customerPointHistory: {
        create: vi.fn().mockResolvedValue({}),
      },
    }

    await addPointTransaction(
      {
        customerId: 'customer-1',
        type: 'used',
        amount: -200,
        description: '予約でポイントを利用',
        reservationId: 'reservation-1',
      },
      tx as any
    )

    expect(tx.customer.updateMany).toHaveBeenCalledWith({
      where: { id: 'customer-1', points: { gte: 200 } },
      data: { points: { increment: -200 } },
    })
    expect(tx.customer.findUnique).toHaveBeenCalledWith({
      where: { id: 'customer-1' },
      select: { points: true },
    })
    expect(tx.customerPointHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        customerId: 'customer-1',
        amount: -200,
        balance: 300,
        reservationId: 'reservation-1',
      }),
    })
    expect(tx.customer.update).not.toHaveBeenCalled()
  })

  it('fails without writing history when the conditional deduction cannot reserve the balance', async () => {
    const tx = {
      customer: {
        findUnique: vi.fn().mockResolvedValue({ points: 100 }),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      customerPointHistory: {
        create: vi.fn(),
      },
    }

    await expect(
      addPointTransaction(
        {
          customerId: 'customer-1',
          type: 'used',
          amount: -200,
          description: '予約でポイントを利用',
        },
        tx as any
      )
    ).rejects.toThrow('Insufficient points')

    expect(tx.customerPointHistory.create).not.toHaveBeenCalled()
    expect(tx.customer.update).not.toHaveBeenCalled()
  })
})

describe('syncReservationPointUsage', () => {
  it('deducts only the increased usage and updates the reservation point history', async () => {
    const tx = {
      customer: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({ id: 'customer-1', points: 700 }),
      },
      customerPointHistory: {
        upsert: vi.fn().mockResolvedValue({}),
        deleteMany: vi.fn(),
      },
    }

    await syncReservationPointUsage(
      {
        customerId: 'customer-1',
        reservationId: 'reservation-1',
        previousPointsUsed: 100,
        nextPointsUsed: 300,
      },
      tx as any
    )

    expect(tx.customer.updateMany).toHaveBeenCalledWith({
      where: { id: 'customer-1', points: { gte: 200 } },
      data: { points: { increment: -200 } },
    })
    expect(tx.customerPointHistory.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ amount: -300, balance: 700 }),
        update: expect.objectContaining({ amount: -300, balance: 700 }),
      })
    )
  })

  it('refunds the reduced usage and removes the used event when usage becomes zero', async () => {
    const tx = {
      customer: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({ id: 'customer-1', points: 1_000 }),
      },
      customerPointHistory: {
        upsert: vi.fn(),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    }

    await syncReservationPointUsage(
      {
        customerId: 'customer-1',
        reservationId: 'reservation-1',
        previousPointsUsed: 300,
        nextPointsUsed: 0,
      },
      tx as any
    )

    expect(tx.customer.updateMany).toHaveBeenCalledWith({
      where: { id: 'customer-1' },
      data: { points: { increment: 300 } },
    })
    expect(tx.customerPointHistory.deleteMany).toHaveBeenCalledWith({
      where: { reservationId: 'reservation-1', type: 'used' },
    })
    expect(tx.customerPointHistory.upsert).not.toHaveBeenCalled()
  })
})

describe('point utils', () => {
  describe('calculateEarnedPoints', () => {
    it('should floor earned points based on config rate', () => {
      expect(
        calculateEarnedPoints(10000, { earnRate: 0.015, expirationMonths: 12, minPointsToUse: 100 })
      ).toBe(150)
      expect(
        calculateEarnedPoints(9999.99, {
          earnRate: 0.01,
          expirationMonths: 12,
          minPointsToUse: 100,
        })
      ).toBe(99)
    })

    it('should return 0 for non-positive amounts', () => {
      expect(calculateEarnedPoints(0)).toBe(0)
      expect(calculateEarnedPoints(-5000)).toBe(0)
      expect(calculateEarnedPoints(Number.NaN)).toBe(0)
    })
  })

  describe('calculateExpiryDate', () => {
    it('should add configured months to provided date', () => {
      const base = new Date('2024-01-15T00:00:00Z')
      const expiry = calculateExpiryDate(
        { earnRate: 0.01, expirationMonths: 6, minPointsToUse: 100 },
        base
      )
      expect(expiry.getUTCFullYear()).toBe(2024)
      expect(expiry.getUTCMonth()).toBe(6) // July (0-indexed)
    })

    it('should default to current date if not provided', () => {
      const now = Date.now()
      const expiry = calculateExpiryDate()
      expect(expiry.getTime()).toBeGreaterThanOrEqual(now)
    })
  })

  describe('resolvePointConfig', () => {
    it('falls back to defaults when settings missing', () => {
      expect(resolvePointConfig()).toEqual({
        earnRate: 0.01,
        expirationMonths: 12,
        minPointsToUse: 100,
      })
    })

    it('normalizes store settings into point config', () => {
      const config = resolvePointConfig({
        pointEarnRate: 2.5,
        pointExpirationMonths: 6,
        pointMinUsage: 200,
      })
      expect(config.earnRate).toBeCloseTo(0.025)
      expect(config.expirationMonths).toBe(6)
      expect(config.minPointsToUse).toBe(200)
    })
  })
})
