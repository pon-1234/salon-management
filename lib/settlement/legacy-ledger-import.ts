/**
 * @design_doc   Monthly gold-esthe cashbook supplement into an existing isolated preview
 * @related_to   mapLegacyCastLedger, extract-gold-master-ikebukuro-preview.php cast-ledger mode
 * @known_issues Yearly archive tables and SK-DB guarantee rows stay out of this single-origin extract
 */
import { z } from 'zod'

import { mapLegacyCastLedger } from './legacy-ledger'

export const IKEBUKURO_LEDGER_ACKNOWLEDGEMENT =
  'IMPORT_IKEBUKURO_CAST_LEDGER_INTO_ISOLATED_PREVIEW'

const integer = z
  .union([z.number().int(), z.string().regex(/^-?[0-9]+$/u)])
  .transform((value) => Number(value))
  .refine(Number.isSafeInteger)
const nonNegativeInteger = integer.refine((value) => value >= 0)
const zeroIfNull = z.union([nonNegativeInteger, z.null()]).transform((value) => value ?? 0)
const nullableText = z.string().nullable()
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u)
const dateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/u)

const cashbookSchema = z
  .object({
    serial: nonNegativeInteger,
    shop_no: integer,
    nyu_date: dateTime,
    nyu_month: z.string().min(1),
    girl_no: nonNegativeInteger,
    kin: integer,
    kind: integer,
    source_table: z
      .string()
      .regex(/^nyukin(?:_[0-9]{4})?$/u)
      .optional(),
    tanto_chk: zeroIfNull.optional().default(0),
    cm: nullableText.optional().default(null),
  })
  .strict()

const officePaySchema = z
  .object({
    serial: nonNegativeInteger,
    shop_no: integer,
    job_date: dateOnly,
    girl_no: nonNegativeInteger,
    kin: integer,
  })
  .strict()

const countsSchema = z
  .object({
    stores: z.literal(1),
    payments: nonNegativeInteger,
    withdrawals: nonNegativeInteger,
    welfareDeductions: nonNegativeInteger,
  })
  .strict()

const snapshotSchema = z
  .object({
    version: z.literal(1),
    kind: z.literal('ikebukuro-cast-ledger'),
    scope: z
      .object({
        sourceDatabase: z.literal('nzuadtjn_gold_master'),
        shopNo: z.literal(5600),
        cutoffAt: dateTime,
        ledgerFrom: dateOnly,
        consistency: z.literal('best-effort-read-only-count-checked'),
      })
      .strict(),
    beforeCounts: countsSchema,
    afterCounts: countsSchema,
    store: z
      .object({
        shop_no: z.literal(5600),
        girls_jikyu: zeroIfNull,
      })
      .strict(),
    rows: z
      .object({
        payments: z.array(cashbookSchema),
        withdrawals: z.array(cashbookSchema),
        welfareDeductions: z.array(officePaySchema),
      })
      .strict(),
  })
  .strict()

export type LegacyCastLedgerSnapshot = z.output<typeof snapshotSchema>

export class LegacyCastLedgerSnapshotError extends Error {
  constructor() {
    super('IKEBUKURO_LEDGER_SNAPSHOT_REJECTED')
    this.name = 'LegacyCastLedgerSnapshotError'
  }
}

export function parseLegacyCastLedgerSnapshot(input: unknown): LegacyCastLedgerSnapshot {
  const snapshot = snapshotSchema.safeParse(input)
  if (!snapshot.success) throw new LegacyCastLedgerSnapshotError()
  const parsed = snapshot.data
  if (
    parsed.beforeCounts.payments !== parsed.afterCounts.payments ||
    parsed.beforeCounts.withdrawals !== parsed.afterCounts.withdrawals ||
    parsed.beforeCounts.welfareDeductions !== parsed.afterCounts.welfareDeductions ||
    parsed.afterCounts.payments !== parsed.rows.payments.length ||
    parsed.afterCounts.withdrawals !== parsed.rows.withdrawals.length ||
    parsed.afterCounts.welfareDeductions !== parsed.rows.welfareDeductions.length
  ) {
    throw new LegacyCastLedgerSnapshotError()
  }
  return parsed
}

export async function applyLegacyCastLedgerSnapshot(input: {
  snapshot: unknown
  storeId: string
  importedCastIds: Set<string>
  acknowledgement: string
  write: {
    createLedgerEntries(
      entries: ReturnType<typeof mapLegacyCastLedger>
    ): Promise<number>
    updateHourlyGuarantee(storeId: string, amount: number): Promise<void>
  }
}): Promise<{
  created: number
  droppedMissingCast: number
  hourlyGuaranteeAmount: number
}> {
  if (input.acknowledgement !== IKEBUKURO_LEDGER_ACKNOWLEDGEMENT) {
    throw new LegacyCastLedgerSnapshotError()
  }
  const snapshot = parseLegacyCastLedgerSnapshot(input.snapshot)
  const sourceRowCount =
    snapshot.rows.payments.length +
    snapshot.rows.withdrawals.length +
    snapshot.rows.welfareDeductions.length
  const entries = mapLegacyCastLedger({
    importedCastIds: input.importedCastIds,
    storeId: input.storeId,
    nyukin: snapshot.rows.payments,
    shukkin: snapshot.rows.withdrawals,
    officePay: snapshot.rows.welfareDeductions,
  })
  const created = await input.write.createLedgerEntries(entries)
  await input.write.updateHourlyGuarantee(input.storeId, snapshot.store.girls_jikyu)
  return {
    created,
    droppedMissingCast: sourceRowCount - entries.length,
    hourlyGuaranteeAmount: snapshot.store.girls_jikyu,
  }
}
