/**
 * @design_doc   refactor-instructions.md Phase 1 characterization coverage
 * @related_to   server.ts - settlement payment transaction and DTO mapping
 * @known_issues Uses mocked Prisma calls; no real database is required
 */
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { db } from '@/lib/db'

import { listSettlementPayments, upsertSettlementPayment } from './server'

vi.mock('@/lib/db', () => ({
  db: {
    $transaction: vi.fn(),
    settlementPayment: {
      findMany: vi.fn(),
    },
  },
}))

type MockedSettlementDb = {
  $transaction: Mock
  settlementPayment: {
    findMany: Mock
  }
}

const mockedDb = db as unknown as MockedSettlementDb

describe('upsertSettlementPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a payment, links reservations, marks matching reservations settled, and returns a DTO', async () => {
    const paymentRecord = {
      id: 'payment-1',
      castId: 'cast-1',
      storeId: 'store-1',
      amount: 32000,
      method: 'cash',
      handledBy: 'admin-1',
      paidAt: new Date('2026-07-04T03:00:00.000Z'),
      notes: '店頭支払い',
    }
    const tx = {
      settlementPayment: {
        create: vi.fn().mockResolvedValue(paymentRecord),
      },
      settlementPaymentReservation: {
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
      reservation: {
        count: vi.fn().mockResolvedValue(2),
        updateMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
    }

    mockedDb.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)
    )

    await expect(
      upsertSettlementPayment({
        castId: 'cast-1',
        storeId: 'store-1',
        amount: 32000,
        method: 'cash',
        handledBy: 'admin-1',
        paidAt: '2026-07-04T03:00:00.000Z',
        notes: '店頭支払い',
        reservationIds: ['reservation-1', 'reservation-2'],
      })
    ).resolves.toEqual({
      id: 'payment-1',
      castId: 'cast-1',
      storeId: 'store-1',
      amount: 32000,
      method: 'cash',
      handledBy: 'admin-1',
      paidAt: '2026-07-04T03:00:00.000Z',
      notes: '店頭支払い',
      reservations: [],
    })

    expect(tx.settlementPayment.create).toHaveBeenCalledWith({
      data: {
        castId: 'cast-1',
        storeId: 'store-1',
        amount: 32000,
        method: 'cash',
        handledBy: 'admin-1',
        paidAt: new Date('2026-07-04T03:00:00.000Z'),
        notes: '店頭支払い',
      },
    })
    expect(tx.settlementPaymentReservation.createMany).toHaveBeenCalledWith({
      data: [
        { paymentId: 'payment-1', reservationId: 'reservation-1' },
        { paymentId: 'payment-1', reservationId: 'reservation-2' },
      ],
    })
    expect(tx.reservation.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['reservation-1', 'reservation-2'] },
        castId: 'cast-1',
        storeId: 'store-1',
      },
      data: { settlementStatus: 'settled' },
    })
  })

  it('updates a payment by clearing old reservation links before creating new ones', async () => {
    const paymentRecord = {
      id: 'payment-1',
      castId: 'cast-1',
      storeId: 'store-1',
      amount: 15000,
      method: 'bank',
      handledBy: 'admin-2',
      paidAt: new Date('2026-07-05T03:00:00.000Z'),
      notes: null,
    }
    const tx = {
      settlementPayment: {
        findFirst: vi.fn().mockResolvedValue({ id: 'payment-1' }),
        update: vi.fn().mockResolvedValue(paymentRecord),
      },
      settlementPaymentReservation: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      reservation: {
        count: vi.fn().mockResolvedValue(1),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    }

    mockedDb.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)
    )

    await upsertSettlementPayment({
      id: 'payment-1',
      castId: 'cast-1',
      storeId: 'store-1',
      amount: 15000,
      method: 'bank',
      handledBy: 'admin-2',
      paidAt: '2026-07-05T03:00:00.000Z',
      reservationIds: ['reservation-3'],
    })

    expect(tx.settlementPayment.update).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: {
        amount: 15000,
        method: 'bank',
        handledBy: 'admin-2',
        paidAt: new Date('2026-07-05T03:00:00.000Z'),
        notes: undefined,
      },
    })
    expect(tx.settlementPaymentReservation.deleteMany).toHaveBeenCalledWith({
      where: { paymentId: 'payment-1' },
    })
    expect(tx.settlementPaymentReservation.createMany).toHaveBeenCalledWith({
      data: [{ paymentId: 'payment-1', reservationId: 'reservation-3' }],
    })
  })

  it('rejects updating a payment that does not belong to the requested cast and store', async () => {
    const tx = {
      settlementPayment: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
      settlementPaymentReservation: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      reservation: {
        count: vi.fn(),
        updateMany: vi.fn(),
      },
    }

    mockedDb.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)
    )

    await expect(
      upsertSettlementPayment({
        id: 'payment-from-another-store',
        castId: 'cast-1',
        storeId: 'store-1',
        amount: 15000,
        method: 'bank',
        handledBy: 'admin-2',
        paidAt: '2026-07-05T03:00:00.000Z',
        reservationIds: ['reservation-3'],
      })
    ).rejects.toThrow('Settlement payment not found')

    expect(tx.settlementPayment.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'payment-from-another-store',
        castId: 'cast-1',
        storeId: 'store-1',
      },
      select: { id: true },
    })
    expect(tx.settlementPayment.update).not.toHaveBeenCalled()
    expect(tx.settlementPaymentReservation.deleteMany).not.toHaveBeenCalled()
  })

  it('rejects linking reservations outside the requested cast and store', async () => {
    const tx = {
      settlementPayment: {
        create: vi.fn(),
      },
      settlementPaymentReservation: {
        createMany: vi.fn(),
      },
      reservation: {
        count: vi.fn().mockResolvedValue(0),
        updateMany: vi.fn(),
      },
    }

    mockedDb.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)
    )

    await expect(
      upsertSettlementPayment({
        castId: 'cast-1',
        storeId: 'store-1',
        amount: 15000,
        method: 'bank',
        handledBy: 'admin-2',
        reservationIds: ['reservation-from-another-store'],
      })
    ).rejects.toThrow('Settlement reservation not found')

    expect(tx.reservation.count).toHaveBeenCalledWith({
      where: {
        id: { in: ['reservation-from-another-store'] },
        castId: 'cast-1',
        storeId: 'store-1',
      },
    })
    expect(tx.settlementPayment.create).not.toHaveBeenCalled()
    expect(tx.settlementPaymentReservation.createMany).not.toHaveBeenCalled()
  })
})

describe('listSettlementPayments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('queries payments by cast and store and maps nested reservations to DTO shape', async () => {
    mockedDb.settlementPayment.findMany.mockResolvedValue([
      {
        id: 'payment-1',
        castId: 'cast-1',
        storeId: 'store-1',
        amount: 32000,
        method: 'cash',
        handledBy: 'admin-1',
        paidAt: new Date('2026-07-04T03:00:00.000Z'),
        notes: null,
        reservations: [
          {
            reservation: {
              id: 'reservation-1',
              startTime: new Date('2026-07-04T01:00:00.000Z'),
              course: { name: '90分コース' },
              staffRevenue: null,
              settlementStatus: null,
            },
          },
          {
            reservation: {
              id: 'reservation-2',
              startTime: new Date('2026-07-04T04:00:00.000Z'),
              course: null,
              staffRevenue: 18000,
              settlementStatus: 'settled',
            },
          },
        ],
      },
    ])

    await expect(listSettlementPayments('cast-1', 'store-1')).resolves.toEqual([
      {
        id: 'payment-1',
        castId: 'cast-1',
        storeId: 'store-1',
        amount: 32000,
        method: 'cash',
        handledBy: 'admin-1',
        paidAt: '2026-07-04T03:00:00.000Z',
        notes: null,
        reservations: [
          {
            id: 'reservation-1',
            startTime: '2026-07-04T01:00:00.000Z',
            courseName: '90分コース',
            staffRevenue: 0,
            settlementStatus: 'pending',
          },
          {
            id: 'reservation-2',
            startTime: '2026-07-04T04:00:00.000Z',
            courseName: null,
            staffRevenue: 18000,
            settlementStatus: 'settled',
          },
        ],
      },
    ])

    expect(mockedDb.settlementPayment.findMany).toHaveBeenCalledWith({
      where: { castId: 'cast-1', storeId: 'store-1' },
      include: {
        reservations: {
          include: {
            reservation: {
              select: {
                id: true,
                startTime: true,
                course: { select: { name: true } },
                staffRevenue: true,
                settlementStatus: true,
              },
            },
          },
        },
      },
      orderBy: { paidAt: 'desc' },
    })
  })
})
