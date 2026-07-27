/**
 * @design_doc   Issue #5 - Payment API trust-boundary tests
 * @related_to   app/api/payments/route.ts, Reservation, PaymentService
 * @known_issues Direct payment remains an administrator-only offline operation
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'

const { mockPaymentService } = vi.hoisted(() => ({
  mockPaymentService: {
    processPayment: vi.fn(),
    getPaymentHistory: vi.fn(),
    getPaymentHistoryByReservation: vi.fn(),
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
    paymentTransaction: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/payment/providers/registry', () => ({
  getPaymentService: vi.fn(() => mockPaymentService),
  isPaymentProviderEnabled: vi.fn((provider: string) => provider === 'manual'),
  getPaymentProviderDisabledReason: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
  },
}))

import { GET, POST } from '../route'

const reservation = {
  id: 'res_123',
  customerId: 'cust_123',
  storeId: 'ginza',
  price: 12_000,
  paymentMethod: '現金',
  status: 'confirmed',
}

const assignedAdmin = {
  user: {
    id: 'admin_123',
    role: 'admin',
    permissions: ['reservation:read', 'reservation:update', 'analytics:read'],
    storeIds: ['ginza'],
  },
}

const ownerCustomer = {
  user: {
    id: 'cust_123',
    role: 'customer',
  },
}

function paymentRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/payments', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('/api/payments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(assignedAdmin as never)
    vi.mocked(db.reservation.findUnique).mockResolvedValue(reservation as never)
    vi.mocked(db.paymentTransaction.findFirst).mockResolvedValue(null)
    mockPaymentService.processPayment.mockResolvedValue({
      success: true,
      transaction: {
        id: 'txn_123',
        reservationId: reservation.id,
        customerId: reservation.customerId,
        amount: reservation.price,
        currency: 'jpy',
        provider: 'manual',
        paymentMethod: 'cash',
        status: 'completed',
        metadata: { storeId: reservation.storeId, privateNote: 'do not expose' },
        stripePaymentId: 'internal-provider-id',
        createdAt: new Date('2026-07-19T00:00:00.000Z'),
        updatedAt: new Date('2026-07-19T00:00:00.000Z'),
      },
    })
  })

  describe('POST', () => {
    it('rejects unauthenticated callers before reading a reservation', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const response = await POST(paymentRequest({ reservationId: reservation.id }))

      expect(response.status).toBe(401)
      expect(db.reservation.findUnique).not.toHaveBeenCalled()
      expect(mockPaymentService.processPayment).not.toHaveBeenCalled()
    })

    it('does not let a customer turn their own reservation into a completed manual payment', async () => {
      vi.mocked(getServerSession).mockResolvedValue(ownerCustomer as never)

      const response = await POST(paymentRequest({ reservationId: reservation.id }))

      expect(response.status).toBe(403)
      expect(mockPaymentService.processPayment).not.toHaveBeenCalled()
    })

    it('requires reservation update permission for offline payment completion', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        ...assignedAdmin,
        user: { ...assignedAdmin.user, permissions: ['reservation:read'] },
      } as never)

      const response = await POST(paymentRequest({ reservationId: reservation.id }))

      expect(response.status).toBe(403)
      expect(db.reservation.findUnique).not.toHaveBeenCalled()
      expect(mockPaymentService.processPayment).not.toHaveBeenCalled()
    })

    it('rejects an administrator not assigned to the reservation store', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        ...assignedAdmin,
        user: { ...assignedAdmin.user, storeIds: ['shinjuku'] },
      } as never)

      const response = await POST(paymentRequest({ reservationId: reservation.id }))

      expect(response.status).toBe(403)
      expect(mockPaymentService.processPayment).not.toHaveBeenCalled()
    })

    it.each([
      [{ customerId: 'cust_attacker' }, 'customerId'],
      [{ amount: 1 }, 'amount'],
      [{ storeId: 'shinjuku' }, 'storeId'],
      [{ currency: 'usd' }, 'currency'],
      [{ paymentMethod: 'card' }, 'paymentMethod'],
    ])('rejects a caller-supplied %s mismatch', async (override, _field) => {
      const response = await POST(
        paymentRequest({
          reservationId: reservation.id,
          customerId: reservation.customerId,
          amount: reservation.price,
          storeId: reservation.storeId,
          currency: 'jpy',
          paymentMethod: 'cash',
          provider: 'manual',
          ...override,
        })
      )

      expect(response.status).toBe(409)
      expect(mockPaymentService.processPayment).not.toHaveBeenCalled()
    })

    it('rejects caller-controlled payment status and metadata', async () => {
      const response = await POST(
        paymentRequest({
          reservationId: reservation.id,
          status: 'completed',
          metadata: { status: 'completed' },
        })
      )

      expect(response.status).toBe(400)
      expect(mockPaymentService.processPayment).not.toHaveBeenCalled()
    })

    it('builds an offline payment exclusively from the persisted reservation', async () => {
      const response = await POST(paymentRequest({ reservationId: reservation.id }))
      const payload = await response.json()

      expect(response.status).toBe(200)
      expect(db.reservation.findUnique).toHaveBeenCalledWith({
        where: { id: reservation.id },
        select: {
          id: true,
          customerId: true,
          storeId: true,
          price: true,
          paymentMethod: true,
          status: true,
        },
      })
      expect(mockPaymentService.processPayment).toHaveBeenCalledWith({
        reservationId: reservation.id,
        customerId: reservation.customerId,
        amount: reservation.price,
        currency: 'jpy',
        paymentMethod: 'cash',
        provider: 'manual',
        metadata: { storeId: reservation.storeId },
      })
      expect(payload).toEqual({
        success: true,
        transaction: {
          id: 'txn_123',
          reservationId: reservation.id,
          customerId: reservation.customerId,
          amount: reservation.price,
          currency: 'jpy',
          provider: 'manual',
          paymentMethod: 'cash',
          status: 'completed',
          createdAt: '2026-07-19T00:00:00.000Z',
          updatedAt: '2026-07-19T00:00:00.000Z',
        },
      })
      expect(JSON.stringify(payload)).not.toMatch(/privateNote|internal-provider-id/)
    })

    it('fails closed when a completed payment already exists', async () => {
      vi.mocked(db.paymentTransaction.findFirst).mockResolvedValue({ id: 'txn_existing' } as never)

      const response = await POST(paymentRequest({ reservationId: reservation.id }))

      expect(response.status).toBe(409)
      expect(db.paymentTransaction.findFirst).toHaveBeenCalledWith({
        where: {
          reservationId: reservation.id,
          type: 'payment',
          status: { in: ['pending', 'processing', 'completed'] },
        },
        select: { id: true },
      })
      expect(mockPaymentService.processPayment).not.toHaveBeenCalled()
    })

    it('returns an idempotent conflict when the database wins a concurrent payment race', async () => {
      mockPaymentService.processPayment.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.0.0',
          meta: { target: 'PaymentTransaction_one_active_payment_per_reservation' },
        })
      )

      const response = await POST(paymentRequest({ reservationId: reservation.id }))

      expect(response.status).toBe(409)
      await expect(response.json()).resolves.toEqual({
        error: 'An active payment already exists for this reservation',
        code: 'ACTIVE_PAYMENT_EXISTS',
      })
    })
  })

  describe('GET', () => {
    it('returns a bounded persisted payment list to an assigned administrator', async () => {
      vi.mocked(db.paymentTransaction.findMany).mockResolvedValueOnce([
        {
          id: 'txn_list',
          reservationId: reservation.id,
          customerId: reservation.customerId,
          amount: 12_000,
          currency: 'jpy',
          provider: 'manual',
          paymentMethod: 'cash',
          status: 'completed',
          processedAt: new Date('2026-07-20T00:00:00.000Z'),
          createdAt: new Date('2026-07-20T00:00:00.000Z'),
          updatedAt: new Date('2026-07-20T00:00:00.000Z'),
        },
      ] as never)

      const response = await GET(
        new NextRequest(
          'http://localhost:3000/api/payments?storeId=ginza&limit=26&offset=25&status=completed'
        )
      )
      const payload = await response.json()

      expect(response.status).toBe(200)
      expect(payload.transactions).toHaveLength(1)
      expect(db.paymentTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            reservation: { storeId: 'ginza' },
            status: 'completed',
          }),
          take: 26,
          skip: 25,
        })
      )
    })

    it('rejects unauthenticated callers before validating filters', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const response = await GET(new NextRequest('http://localhost:3000/api/payments'))

      expect(response.status).toBe(401)
      expect(mockPaymentService.getPaymentHistory).not.toHaveBeenCalled()
    })

    it('lets a customer read only their own payment history', async () => {
      vi.mocked(getServerSession).mockResolvedValue(ownerCustomer as never)
      mockPaymentService.getPaymentHistory.mockResolvedValue([])

      const ownResponse = await GET(
        new NextRequest('http://localhost:3000/api/payments?customerId=cust_123')
      )
      const otherResponse = await GET(
        new NextRequest('http://localhost:3000/api/payments?customerId=cust_other')
      )

      expect(ownResponse.status).toBe(200)
      expect(otherResponse.status).toBe(403)
      expect(mockPaymentService.getPaymentHistory).toHaveBeenCalledTimes(1)
      expect(mockPaymentService.getPaymentHistory).toHaveBeenCalledWith('cust_123')
    })

    it('checks reservation ownership before returning reservation history to a customer', async () => {
      vi.mocked(getServerSession).mockResolvedValue(ownerCustomer as never)
      mockPaymentService.getPaymentHistoryByReservation.mockResolvedValue([])

      const ownResponse = await GET(
        new NextRequest('http://localhost:3000/api/payments?reservationId=res_123')
      )
      vi.mocked(db.reservation.findUnique).mockResolvedValueOnce({
        ...reservation,
        customerId: 'cust_other',
      } as never)
      const otherResponse = await GET(
        new NextRequest('http://localhost:3000/api/payments?reservationId=res_123')
      )

      expect(ownResponse.status).toBe(200)
      expect(otherResponse.status).toBe(403)
      expect(mockPaymentService.getPaymentHistoryByReservation).toHaveBeenCalledTimes(1)
    })

    it('lets only an assigned administrator with read permission inspect a reservation payment', async () => {
      mockPaymentService.getPaymentHistoryByReservation.mockResolvedValue([])

      const assignedResponse = await GET(
        new NextRequest('http://localhost:3000/api/payments?reservationId=res_123')
      )
      vi.mocked(getServerSession).mockResolvedValue({
        ...assignedAdmin,
        user: { ...assignedAdmin.user, storeIds: ['shinjuku'] },
      } as never)
      const unassignedResponse = await GET(
        new NextRequest('http://localhost:3000/api/payments?reservationId=res_123')
      )

      expect(assignedResponse.status).toBe(200)
      expect(unassignedResponse.status).toBe(403)
      expect(mockPaymentService.getPaymentHistoryByReservation).toHaveBeenCalledTimes(1)
    })

    it('fails closed for administrator customer-wide history because customers are not store-owned', async () => {
      const response = await GET(
        new NextRequest('http://localhost:3000/api/payments?customerId=cust_123')
      )

      expect(response.status).toBe(400)
      expect(mockPaymentService.getPaymentHistory).not.toHaveBeenCalled()
    })
  })
})
