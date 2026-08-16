/**
 * @design_doc   Store-wide payment and settlement ledgers for Ikebukuro operations
 * @related_to   GET /api/admin/settlements, payment-processing and settlement-processing pages
 * @known_issues Legacy settlement history is not imported
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '@/lib/db'

import { getStoreSettlementLedger } from './store-ledger'

vi.mock('@/lib/db', () => ({
  db: {
    reservation: {
      findMany: vi.fn(),
    },
    settlementPayment: {
      findMany: vi.fn(),
    },
    castLedgerEntry: {
      findMany: vi.fn(),
    },
    storeSettings: {
      findUnique: vi.fn(),
    },
  },
}))

describe('getStoreSettlementLedger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.reservation.findMany).mockResolvedValue([
      {
        id: 'reservation-1',
        castId: 'cast-1',
        startTime: new Date('2026-08-15T12:00:00.000Z'),
        status: 'completed',
        settlementStatus: 'pending',
        price: 30_000,
        staffRevenue: 18_000,
        storeRevenue: 12_000,
        welfareExpense: 3_000,
        paymentMethod: 'カード',
        paymentReference: 'UAT-0815-1030',
        cast: { id: 'cast-1', name: 'さら' },
        course: { name: '90分' },
        customer: { name: '[UAT] 予約確認' },
      },
    ] as never)
    vi.mocked(db.settlementPayment.findMany).mockResolvedValue([
      {
        id: 'payment-1',
        castId: 'cast-1',
        amount: 18_000,
        method: 'cash',
        handledBy: 'admin-1',
        paidAt: new Date('2026-08-15T15:00:00.000Z'),
        notes: null,
        cast: { name: 'さら' },
        reservations: [{ reservationId: 'reservation-2' }],
      },
    ] as never)
    vi.mocked(db.castLedgerEntry.findMany).mockResolvedValue([
      {
        id: 'legacy-ledger-nyukin-11',
        castId: 'cast-1',
        sourceTable: 'nyukin',
        direction: 'inbound',
        kind: 'cash',
        amount: 18_000,
        notes: '現金精算',
        handledBy: '1',
        occurredAt: new Date('2026-08-10T03:00:00.000Z'),
        cast: { name: 'さら' },
      },
    ] as never)
    vi.mocked(db.storeSettings.findUnique).mockResolvedValue({
      hourlyGuaranteeAmount: 5000,
    } as never)
  })

  it('groups completed reservations and payments for one JST month', async () => {
    const ledger = await getStoreSettlementLedger('ikebukuro', 2026, 8)

    expect(db.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          storeId: 'ikebukuro',
          status: 'completed',
        }),
      })
    )
    expect(ledger.month).toBe('2026-08')
    expect(ledger.casts[0]).toMatchObject({
      castId: 'cast-1',
      castName: 'さら',
      pendingCount: 1,
      pendingAmount: 18_000,
      staffRevenue: 18_000,
      storeRevenue: 12_000,
    })
    expect(ledger.casts[0]?.pendingReservations[0]).toMatchObject({
      id: 'reservation-1',
      paymentReference: 'UAT-0815-1030',
      takeHome: 18_000,
    })
    expect(ledger.payments[0]).toMatchObject({
      id: 'payment-1',
      castName: 'さら',
      amount: 18_000,
    })
    expect(ledger.hourlyGuaranteeAmount).toBe(5000)
    expect(ledger.legacyEntries[0]).toMatchObject({
      id: 'legacy-ledger-nyukin-11',
      sourceTable: 'nyukin',
      direction: 'inbound',
      amount: 18_000,
    })
  })
})
