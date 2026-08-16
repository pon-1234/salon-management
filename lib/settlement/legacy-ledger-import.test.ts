/**
 * @design_doc   Monthly gold-esthe cashbook supplement into an existing isolated preview
 * @related_to   mapLegacyCastLedger, extract-gold-master-ikebukuro-preview.php cast-ledger mode
 * @known_issues Yearly archive tables and SK-DB guarantee rows stay out of this single-origin extract
 */
import { describe, expect, it, vi } from 'vitest'

import {
  IKEBUKURO_LEDGER_ACKNOWLEDGEMENT,
  applyLegacyCastLedgerSnapshot,
  parseLegacyCastLedgerSnapshot,
} from './legacy-ledger-import'

const snapshot = {
  version: 1,
  kind: 'ikebukuro-cast-ledger',
  scope: {
    sourceDatabase: 'nzuadtjn_gold_master',
    shopNo: 5600,
    cutoffAt: '2026-08-16T18:00:00+09:00',
    ledgerFrom: '2020-01-01',
    consistency: 'best-effort-read-only-count-checked',
  },
  beforeCounts: { stores: 1, payments: 1, withdrawals: 1, welfareDeductions: 1 },
  afterCounts: { stores: 1, payments: 1, withdrawals: 1, welfareDeductions: 1 },
  store: { shop_no: 5600, girls_jikyu: 5000 },
  rows: {
    payments: [
      {
        serial: 11,
        shop_no: 5600,
        nyu_date: '2026-07-20 12:00:00',
        nyu_month: '2026-07-01',
        girl_no: 56019,
        kin: 18000,
        kind: 0,
        tanto_chk: 1,
        cm: '現金精算',
      },
    ],
    withdrawals: [
      {
        serial: 21,
        shop_no: 5600,
        nyu_date: '2026-07-21 15:00:00',
        nyu_month: '2026-07-01',
        girl_no: 56019,
        kin: -3000,
        kind: 0,
        tanto_chk: 1,
        cm: 'カード分',
      },
    ],
    welfareDeductions: [
      {
        serial: 31,
        shop_no: 5600,
        job_date: '2026-07-20',
        girl_no: 56019,
        kin: 1800,
      },
    ],
  },
}

describe('parseLegacyCastLedgerSnapshot', () => {
  it('accepts a count-checked cashbook snapshot without customer rows', () => {
    expect(parseLegacyCastLedgerSnapshot(snapshot)).toEqual(
      expect.objectContaining({
        kind: 'ikebukuro-cast-ledger',
        store: { shop_no: 5600, girls_jikyu: 5000 },
      })
    )
  })

  it('rejects a snapshot whose counts do not match the cashbook rows', () => {
    expect(() =>
      parseLegacyCastLedgerSnapshot({
        ...snapshot,
        afterCounts: { ...snapshot.afterCounts, payments: 2 },
      })
    ).toThrow('IKEBUKURO_LEDGER_SNAPSHOT_REJECTED')
  })
})

describe('applyLegacyCastLedgerSnapshot', () => {
  it('writes only ledger rows for imported casts and the hourly guarantee', async () => {
    const createLedgerEntries = vi.fn(async (entries: unknown[]) => entries.length)
    const updateHourlyGuarantee = vi.fn(async () => undefined)

    const result = await applyLegacyCastLedgerSnapshot({
      snapshot,
      storeId: 'uat-ikebukuro',
      importedCastIds: new Set(['legacy-cast-56019']),
      acknowledgement: IKEBUKURO_LEDGER_ACKNOWLEDGEMENT,
      write: { createLedgerEntries, updateHourlyGuarantee },
    })

    expect(result).toEqual({
      created: 3,
      droppedMissingCast: 0,
      hourlyGuaranteeAmount: 5000,
    })
    expect(createLedgerEntries).toHaveBeenCalledWith([
      expect.objectContaining({ sourceTable: 'nyukin', amount: 18000 }),
      expect.objectContaining({ sourceTable: 'shukkin', amount: -3000 }),
      expect.objectContaining({ sourceTable: 'office_pay', amount: 1800 }),
    ])
    expect(updateHourlyGuarantee).toHaveBeenCalledWith('uat-ikebukuro', 5000)
  })

  it('drops cashbook rows whose casts were not imported', async () => {
    const createLedgerEntries = vi.fn(async (entries: unknown[]) => entries.length)
    const result = await applyLegacyCastLedgerSnapshot({
      snapshot,
      storeId: 'uat-ikebukuro',
      importedCastIds: new Set(['legacy-cast-1']),
      acknowledgement: IKEBUKURO_LEDGER_ACKNOWLEDGEMENT,
      write: {
        createLedgerEntries,
        updateHourlyGuarantee: vi.fn(async () => undefined),
      },
    })

    expect(result.created).toBe(0)
    expect(result.droppedMissingCast).toBe(3)
    expect(createLedgerEntries).toHaveBeenCalledWith([])
  })
})
