/**
 * @design_doc   Issue #5 - Payment-intent fail-closed boundary tests
 * @related_to   app/api/payments/intents/route.ts, Reservation, PaymentService
 * @known_issues Online provider and signed webhook confirmation are not implemented
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'

const { mockPaymentService } = vi.hoisted(() => ({
  mockPaymentService: {
    createPaymentIntent: vi.fn(),
    confirmPaymentIntent: vi.fn(),
  },
}))

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/config', () => ({ authOptions: {} }))

vi.mock('@/lib/db', () => ({
  db: {
    reservation: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/payment/providers/registry', () => ({
  getPaymentService: vi.fn(() => mockPaymentService),
}))

vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
  },
}))

import { PATCH, POST } from '../route'

const reservation = {
  id: 'res_123',
  customerId: 'cust_123',
  storeId: 'ginza',
  price: 12_000,
  paymentMethod: 'クレジットカード',
  status: 'confirmed',
}

const ownerCustomer = {
  user: { id: 'cust_123', role: 'customer' },
}

const assignedAdmin = {
  user: {
    id: 'admin_123',
    role: 'admin',
    permissions: ['reservation:update'],
    storeIds: ['ginza'],
  },
}

function intentRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/payments/intents', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('/api/payments/intents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(ownerCustomer as never)
    vi.mocked(db.reservation.findUnique).mockResolvedValue(reservation as never)
  })

  describe('POST', () => {
    it('rejects unauthenticated callers before reading a reservation', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const response = await POST(intentRequest({ reservationId: reservation.id }))

      expect(response.status).toBe(401)
      expect(db.reservation.findUnique).not.toHaveBeenCalled()
      expect(mockPaymentService.createPaymentIntent).not.toHaveBeenCalled()
    })

    it('rejects a customer starting an intent for another customer reservation', async () => {
      vi.mocked(db.reservation.findUnique).mockResolvedValue({
        ...reservation,
        customerId: 'cust_other',
      } as never)

      const response = await POST(intentRequest({ reservationId: reservation.id }))

      expect(response.status).toBe(403)
      expect(mockPaymentService.createPaymentIntent).not.toHaveBeenCalled()
    })

    it('rejects an administrator not assigned to the reservation store', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        ...assignedAdmin,
        user: { ...assignedAdmin.user, storeIds: ['shinjuku'] },
      } as never)

      const response = await POST(intentRequest({ reservationId: reservation.id }))

      expect(response.status).toBe(403)
      expect(mockPaymentService.createPaymentIntent).not.toHaveBeenCalled()
    })

    it('validates caller-supplied identity and amount against the reservation', async () => {
      const response = await POST(
        intentRequest({ reservationId: reservation.id, customerId: 'cust_other', amount: 1 })
      )

      expect(response.status).toBe(409)
      expect(mockPaymentService.createPaymentIntent).not.toHaveBeenCalled()
    })

    it.each([ownerCustomer, assignedAdmin])(
      'fails closed for authorized callers until an online provider and signed callback exist',
      async (session) => {
        vi.mocked(getServerSession).mockResolvedValue(session as never)

        const response = await POST(intentRequest({ reservationId: reservation.id }))

        expect(response.status).toBe(503)
        await expect(response.json()).resolves.toEqual({
          error: 'Online payment intents are not configured',
        })
        expect(mockPaymentService.createPaymentIntent).not.toHaveBeenCalled()
      }
    )

    it('rejects caller-controlled intent status and metadata', async () => {
      const response = await POST(
        intentRequest({
          reservationId: reservation.id,
          status: 'completed',
          metadata: { status: 'completed' },
        })
      )

      expect(response.status).toBe(400)
      expect(mockPaymentService.createPaymentIntent).not.toHaveBeenCalled()
    })
  })

  describe('PATCH', () => {
    it('rejects unauthenticated confirmation attempts', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const response = await PATCH(
        new NextRequest('http://localhost:3000/api/payments/intents', {
          method: 'PATCH',
          body: JSON.stringify({ intentId: 'pi_123' }),
        })
      )

      expect(response.status).toBe(401)
      expect(mockPaymentService.confirmPaymentIntent).not.toHaveBeenCalled()
    })

    it('does not let a caller forge a completed intent', async () => {
      const response = await PATCH(
        new NextRequest('http://localhost:3000/api/payments/intents', {
          method: 'PATCH',
          body: JSON.stringify({ intentId: 'pi_123', status: 'completed' }),
        })
      )

      expect(response.status).toBe(400)
      expect(mockPaymentService.confirmPaymentIntent).not.toHaveBeenCalled()
    })

    it('fails closed because intent ownership and signed provider confirmation are unavailable', async () => {
      const response = await PATCH(
        new NextRequest('http://localhost:3000/api/payments/intents', {
          method: 'PATCH',
          body: JSON.stringify({ intentId: 'pi_123' }),
        })
      )

      expect(response.status).toBe(503)
      await expect(response.json()).resolves.toEqual({
        error: 'Payment intent confirmation requires a signed provider callback',
      })
      expect(mockPaymentService.confirmPaymentIntent).not.toHaveBeenCalled()
    })
  })
})
