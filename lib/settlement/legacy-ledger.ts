/**
 * @design_doc   Monthly gold-esthe cashbook mapping from nyukin / shukkin / office_pay
 * @related_to   extract-gold-master-ikebukuro-preview.php, gold-master-fixture
 * @known_issues Yearly archive tables and SK-DB guarantee rows stay out of this single-origin extract
 */

export type LegacyCashbookRow = {
  serial: number
  shop_no: number
  nyu_date: string
  nyu_month: string
  girl_no: number
  kin: number
  kind: number
  source_table?: string
  tanto_chk?: number
  cm?: string | null
}

export type LegacyOfficePayRow = {
  serial: number
  shop_no: number
  job_date: string
  girl_no: number
  kin: number
}

export type LegacyCastLedgerEntry = {
  id: string
  storeId: string
  castId: string
  sourceTable: 'nyukin' | 'shukkin' | 'office_pay' | `nyukin_${number}`
  sourceKey: string
  businessMonth: string
  occurredAt: Date
  direction: 'inbound' | 'outbound' | 'deduction'
  kind: 'cash' | 'transfer' | 'payout' | 'welfare'
  amount: number
  notes: string
  handledBy: string
}

const NYUKIN_KIND = {
  0: 'cash',
  1: 'transfer',
  2: 'payout',
} as const

function businessMonthFrom(value: string): string {
  const match = value.match(/^(\d{4})[-/]?(\d{2})/u)
  if (!match) throw new Error(`Unsupported legacy month: ${value}`)
  return `${match[1]}-${match[2]}`
}

function parseLegacyDateTime(value: string): Date {
  const normalized = value.includes('T') ? value : value.replace(' ', 'T')
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) throw new Error(`Unsupported legacy datetime: ${value}`)
  return parsed
}

function depositKind(kind: number): LegacyCastLedgerEntry['kind'] {
  return NYUKIN_KIND[kind as keyof typeof NYUKIN_KIND] ?? 'cash'
}

function nyukinSourceTable(value: string | undefined): LegacyCastLedgerEntry['sourceTable'] {
  if (value === undefined || value === 'nyukin') return 'nyukin'
  if (/^nyukin_[0-9]{4}$/u.test(value)) return value as `nyukin_${number}`
  throw new Error(`Unsupported nyukin source table: ${value}`)
}

export function mapLegacyCastLedger(input: {
  importedCastIds: Set<string>
  storeId: string
  nyukin: LegacyCashbookRow[]
  shukkin: LegacyCashbookRow[]
  officePay: LegacyOfficePayRow[]
}): LegacyCastLedgerEntry[] {
  const entries: LegacyCastLedgerEntry[] = []

  for (const row of input.nyukin) {
    const castId = `legacy-cast-${row.girl_no}`
    if (!input.importedCastIds.has(castId)) continue
    const sourceTable = nyukinSourceTable(row.source_table)
    entries.push({
      id: `legacy-ledger-${sourceTable}-${row.serial}`,
      storeId: input.storeId,
      castId,
      sourceTable,
      sourceKey: String(row.serial),
      businessMonth: businessMonthFrom(row.nyu_month || row.nyu_date),
      occurredAt: parseLegacyDateTime(row.nyu_date),
      direction: 'inbound',
      kind: depositKind(row.kind),
      amount: row.kin,
      notes: row.cm?.trim() ?? '',
      handledBy: String(row.tanto_chk ?? ''),
    })
  }

  for (const row of input.shukkin) {
    const castId = `legacy-cast-${row.girl_no}`
    if (!input.importedCastIds.has(castId)) continue
    entries.push({
      id: `legacy-ledger-shukkin-${row.serial}`,
      storeId: input.storeId,
      castId,
      sourceTable: 'shukkin',
      sourceKey: String(row.serial),
      businessMonth: businessMonthFrom(row.nyu_month || row.nyu_date),
      occurredAt: parseLegacyDateTime(row.nyu_date),
      direction: 'outbound',
      kind: depositKind(row.kind),
      amount: row.kin,
      notes: row.cm?.trim() ?? '',
      handledBy: String(row.tanto_chk ?? ''),
    })
  }

  for (const row of input.officePay) {
    const castId = `legacy-cast-${row.girl_no}`
    if (!input.importedCastIds.has(castId)) continue
    const sourceKey = String(row.serial)
    entries.push({
      id: `legacy-ledger-office_pay-${sourceKey}`,
      storeId: input.storeId,
      castId,
      sourceTable: 'office_pay',
      sourceKey,
      businessMonth: businessMonthFrom(row.job_date),
      occurredAt: parseLegacyDateTime(`${row.job_date}T00:00:00`),
      direction: 'deduction',
      kind: 'welfare',
      amount: row.kin,
      notes: '厚生費',
      handledBy: '',
    })
  }

  return entries
}
