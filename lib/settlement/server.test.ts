/**
 * @design_doc   Completed-reservation settlement integrity contract
 * @related_to   server.ts - allocation validation, payment transaction, and DTO mapping
 * @known_issues Uses mocked Prisma calls; database uniqueness is covered by the migration contract
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

  it('rejects an unallocated payment before opening a transaction', async () => {
    await expect(
      upsertSettlementPayment({
        castId: 'cast-1',
        storeId: 'store-1',
        amount: 15000,
        method: 'cash',
        handledBy: 'admin-1',
        reservationIds: [],
      })
    ).rejects.toThrow('At least one settlement reservation is required')

    expect(mockedDb.$transaction).not.toHaveBeenCalled()
  })

  it('rejects a payment amount that differs from the selected completed reservation shares', async () => {
    const tx = {
      settlementPayment: {
        create: vi.fn().mockResolvedValue({ id: 'payment-1' }),
      },
      settlementPaymentReservation: {
        createMany: vi.fn(),
      },
      reservation: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'reservation-1',
            status: 'completed',
            staffRevenue: 15000,
            settlementPayments: [],
          },
        ]),
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
        amount: 14000,
        method: 'cash',
        handledBy: 'admin-1',
        reservationIds: ['reservation-1'],
      })
    ).rejects.toThrow('Settlement amount must equal selected reservation staff revenue')

    expect(tx.settlementPayment.create).not.toHaveBeenCalled()
  })

  it('rejects non-completed or previously allocated reservations', async () => {
    const tx = {
      settlementPayment: {
        create: vi.fn().mockResolvedValue({ id: 'payment-1' }),
      },
      settlementPaymentReservation: {
        createMany: vi.fn(),
      },
      reservation: {
        count: vi.fn().mockResolvedValue(2),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'reservation-pending',
            status: 'confirmed',
            staffRevenue: 15000,
            settlementPayments: [],
          },
          {
            id: 'reservation-paid',
            status: 'completed',
            staffRevenue: 15000,
            settlementPayments: [{ paymentId: 'another-payment' }],
          },
        ]),
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
        amount: 30000,
        method: 'cash',
        handledBy: 'admin-1',
        reservationIds: ['reservation-pending', 'reservation-paid'],
      })
    ).rejects.toThrow('Only completed, unallocated reservations can be settled')

    expect(tx.settlementPayment.create).not.toHaveBeenCalled()
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
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'reservation-1',
            status: 'completed',
            settlementStatus: 'pending',
            staffRevenue: 14000,
            settlementPayments: [],
          },
          {
            id: 'reservation-2',
            status: 'completed',
            settlementStatus: 'pending',
            staffRevenue: 18000,
            settlementPayments: [],
          },
        ]),
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
        findFirst: vi.fn().mockResolvedValue({
          id: 'payment-1',
          reservations: [{ reservationId: 'reservation-1' }],
        }),
        update: vi.fn().mockResolvedValue(paymentRecord),
      },
      settlementPaymentReservation: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      reservation: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'reservation-3',
            status: 'completed',
            settlementStatus: 'pending',
            staffRevenue: 15000,
            settlementPayments: [],
          },
        ]),
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
    expect(tx.reservation.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: { in: ['reservation-1'] },
        castId: 'cast-1',
        storeId: 'store-1',
      },
      data: { settlementStatus: 'pending' },
    })
    expect(tx.reservation.updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        id: { in: ['reservation-3'] },
        castId: 'cast-1',
        storeId: 'store-1',
      },
      data: { settlementStatus: 'settled' },
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
        findMany: vi.fn(),
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
      select: {
        id: true,
        reservations: { select: { reservationId: true } },
      },
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
        findMany: vi.fn().mockResolvedValue([]),
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

    expect(tx.reservation.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['reservation-from-another-store'] },
        castId: 'cast-1',
        storeId: 'store-1',
      },
      select: {
        id: true,
        status: true,
        settlementStatus: true,
        staffRevenue: true,
        settlementPayments: {
          select: { paymentId: true },
        },
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
