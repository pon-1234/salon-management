/**
 * @design_doc   Monthly gold-esthe cashbook mapping from nyukin / shukkin / office_pay
 * @related_to   extract-gold-master-ikebukuro-preview.php, gold-master-fixture
 * @known_issues Yearly archive tables and SK-DB guarantee rows stay out of this single-origin extract
 */
import { describe, expect, it } from 'vitest'

import { mapLegacyCastLedger } from './legacy-ledger'

describe('mapLegacyCastLedger', () => {
  const importedCastIds = new Set(['legacy-cast-56060'])

  it('maps monthly deposits, withdrawals, and welfare deductions without attaching reservations', () => {
    const entries = mapLegacyCastLedger({
      importedCastIds,
      storeId: 'uat-ikebukuro',
      nyukin: [
        {
          serial: 11,
          shop_no: 5600,
          nyu_date: '2026-08-10 12:00:00',
          nyu_month: '2026-08-01',
          girl_no: 56060,
          kin: 18000,
          kind: 0,
        },
        {
          serial: 12,
          shop_no: 5600,
          nyu_date: '2026-08-11 12:00:00',
          nyu_month: '2026-08-00',
          girl_no: 56060,
          kin: 5000,
          kind: 1,
        },
      ],
      shukkin: [
        {
          serial: 21,
          shop_no: 5600,
          nyu_date: '2026-08-12 15:00:00',
          nyu_month: '2026-08-01',
          girl_no: 56060,
          kin: -3000,
          kind: 0,
        },
      ],
      officePay: [
        {
          serial: 31,
          shop_no: 5600,
          job_date: '2026-08-10',
          girl_no: 56060,
          kin: 1800,
        },
      ],
    })

    expect(entries).toEqual([
      expect.objectContaining({
        id: 'legacy-ledger-nyukin-11',
        castId: 'legacy-cast-56060',
        sourceTable: 'nyukin',
        sourceKey: '11',
        businessMonth: '2026-08',
        direction: 'inbound',
        kind: 'cash',
        amount: 18000,
        notes: '',
        handledBy: '',
      }),
      expect.objectContaining({
        id: 'legacy-ledger-nyukin-12',
        direction: 'inbound',
        kind: 'transfer',
        amount: 5000,
        businessMonth: '2026-08',
      }),
      expect.objectContaining({
        id: 'legacy-ledger-shukkin-21',
        sourceTable: 'shukkin',
        direction: 'outbound',
        kind: 'cash',
        amount: -3000,
      }),
      expect.objectContaining({
        id: 'legacy-ledger-office_pay-31',
        sourceTable: 'office_pay',
        sourceKey: '31',
        direction: 'deduction',
        kind: 'welfare',
        amount: 1800,
        businessMonth: '2026-08',
      }),
    ])
  })

  it('rejects an unsupported nyukin source table', () => {
    expect(() =>
      mapLegacyCastLedger({
        importedCastIds,
        storeId: 'uat-ikebukuro',
        nyukin: [
          {
            serial: 11,
            shop_no: 5600,
            nyu_date: '2025-07-20 12:00:00',
            nyu_month: '2025-07-01',
            girl_no: 56060,
            kin: 9000,
            kind: 0,
            source_table: 'orders',
          },
        ],
        shukkin: [],
        officePay: [],
      })
    ).toThrow('Unsupported nyukin source table: orders')
  })

  it('keeps yearly nyukin partitions unique by physical table', () => {
    expect(
      mapLegacyCastLedger({
        importedCastIds,
        storeId: 'uat-ikebukuro',
        nyukin: [
          {
            serial: 11,
            shop_no: 5600,
            nyu_date: '2025-07-20 12:00:00',
            nyu_month: '2025-07-01',
            girl_no: 56060,
            kin: 9000,
            kind: 0,
            source_table: 'nyukin_2025',
          },
        ],
        shukkin: [],
        officePay: [],
      })
    ).toEqual([
      expect.objectContaining({
        id: 'legacy-ledger-nyukin_2025-11',
        sourceTable: 'nyukin_2025',
        sourceKey: '11',
        amount: 9000,
      }),
    ])
  })

  it('drops rows for casts that were not imported', () => {
    expect(
      mapLegacyCastLedger({
        importedCastIds,
        storeId: 'uat-ikebukuro',
        nyukin: [
          {
            serial: 99,
            shop_no: 5600,
            nyu_date: '2026-08-10 12:00:00',
            nyu_month: '2026-08-01',
            girl_no: 1,
            kin: 1000,
            kind: 0,
          },
        ],
        shukkin: [],
        officePay: [],
      })
    ).toEqual([])
  })
})
