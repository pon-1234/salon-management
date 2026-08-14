/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md B-1
 * @related_to   GET /api/payments: persisted payment transaction list
 * @known_issues None
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('payment status page', () => {
  it('loads persisted transactions instead of demonstration rows', async () => {
    const source = await readFile(
      resolve(process.cwd(), 'app/(admin)/admin/analytics/payment-status/page.tsx'),
      'utf8'
    )

    expect(source).toContain('/api/payments?')
    expect(source).toContain('storeId')
    expect(source).not.toContain('mockPayments')
    expect(source).not.toContain('txn_001')
  })

  it('uses the server summary for the full filtered period and an exclusive next-day end bound', async () => {
    const source = await readFile(
      resolve(process.cwd(), 'app/(admin)/admin/analytics/payment-status/page.tsx'),
      'utf8'
    )

    expect(source).toContain('endExclusive')
    expect(source).toContain('startOfDay(addDays(endDate, 1))')
    expect(source).toContain('<PaymentStatusTable payments={payments} summary={summary}')
  })

  it('returns to the first page whenever a filter value changes', async () => {
    const source = await readFile(
      resolve(process.cwd(), 'app/(admin)/admin/analytics/payment-status/page.tsx'),
      'utf8'
    )

    expect(source).toContain('const handleStatusFilterChange')
    expect(source).toContain('const handleProviderFilterChange')
    expect(source).toContain('const handleStartDateChange')
    expect(source).toContain('const handleEndDateChange')
    expect(source.match(/setPage\(0\)/gu)).toHaveLength(4)
  })
})
