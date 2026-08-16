/**
 * @design_doc   Monthly gold-esthe cashbook supplement into an existing isolated preview
 * @related_to   legacy-ledger-import.ts and extract-gold-master-ikebukuro-preview.php
 * @known_issues Uses injected dependencies and never connects to a real database
 */
import { Prisma } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'

import {
  IKEBUKURO_LEDGER_ACKNOWLEDGEMENT,
  runGoldMasterLedgerImport,
} from './import-gold-master-ikebukuro-ledger'

const snapshotPath = '/private/ikebukuro-cast-ledger.json'
const environment = {
  APP_RUNTIME_MODE: 'preview',
  OUTBOUND_DELIVERY_MODE: 'disabled',
  DATABASE_URL: 'postgresql://preview:db-secret@db:5432/salon_uat_preview?schema=public',
  PREVIEW_TARGET_ID: 'preview-uat-target-id-20260720',
}
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
  beforeCounts: { stores: 1, payments: 1, withdrawals: 0, welfareDeductions: 0 },
  afterCounts: { stores: 1, payments: 1, withdrawals: 0, welfareDeductions: 0 },
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
    withdrawals: [],
    welfareDeductions: [],
  },
}

describe('runGoldMasterLedgerImport', () => {
  it('imports ledger rows into a marked preview without emptying other tables', async () => {
    const createMany = vi.fn(async ({ data }: { data: unknown[] }) => ({ count: data.length }))
    const update = vi.fn(async () => ({ count: 1 }))
    const writeOutput = vi.fn()
    const writeError = vi.fn()
    const code = await runGoldMasterLedgerImport(
      ['--snapshot', snapshotPath, '--store-id', 'uat-ikebukuro', '--ack', IKEBUKURO_LEDGER_ACKNOWLEDGEMENT],
      environment,
      {
        readSnapshot: async () => snapshot,
        createClient: () => ({
          $queryRaw: async <T>(_query: Prisma.Sql) =>
            [
              {
                databaseName: 'salon_uat_preview',
                environment: 'staging-preview',
                marker: 'preview-uat-target-id-20260720',
              },
            ] as T,
          $transaction: vi.fn(async (operation) =>
            operation({
              cast: {
                findMany: vi.fn(async () => [{ id: 'legacy-cast-56019' }]),
              },
              castLedgerEntry: { createMany },
              storeSettings: { update },
            })
          ),
          $disconnect: vi.fn(async () => undefined),
        }),
        writeOutput,
        writeError,
      }
    )

    expect(writeError.mock.calls).toEqual([])
    expect(code).toBe(0)
    expect(createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ sourceTable: 'nyukin', amount: 18000 })],
      skipDuplicates: true,
    })
    expect(update).toHaveBeenCalledWith({
      where: { storeId: 'uat-ikebukuro' },
      data: { hourlyGuaranteeAmount: 5000 },
    })
    expect(writeOutput).toHaveBeenCalledWith(
      'Ikebukuro cast ledger imported: created=1 droppedMissingCast=0 hourlyGuaranteeAmount=5000'
    )
  })

  it('rejects a non-preview runtime before reading the snapshot', async () => {
    const readSnapshot = vi.fn()
    const code = await runGoldMasterLedgerImport(
      ['--snapshot', snapshotPath, '--store-id', 'uat-ikebukuro', '--ack', IKEBUKURO_LEDGER_ACKNOWLEDGEMENT],
      { ...environment, APP_RUNTIME_MODE: 'production' },
      {
        readSnapshot,
        createClient: () => {
          throw new Error('must not connect')
        },
        writeOutput: vi.fn(),
        writeError: vi.fn(),
      }
    )

    expect(code).toBe(1)
    expect(readSnapshot).not.toHaveBeenCalled()
  })
})
