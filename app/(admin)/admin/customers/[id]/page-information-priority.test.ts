/**
 * @design_doc   Customer detail information-priority contract for field reservation operations
 * @related_to   CustomerProfile and customer-insight-priority
 * @known_issues None
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { partitionCustomerInsightMetrics } from './customer-insight-priority'

const source = readFileSync(join(__dirname, 'page.tsx'), 'utf8')

describe('customer profile information priority', () => {
  it('keeps reservation-operation metrics first and retains every other metric', () => {
    const metrics = [
      { label: '客単価', value: '¥12,000' },
      { label: '前回ご利用のキャスト', value: 'さら' },
      { label: '新しい追加指標', value: '1件' },
      { label: 'キャンセル回数(お客様)', value: '0/3回' },
      { label: '前回ご利用日', value: '2026/08/13' },
      { label: '累計利用回数', value: '8回' },
      { label: 'キャンセル回数(お店)', value: '0/3回' },
      { label: 'チャット累計数', value: '店舗別集計未対応' },
    ]

    const result = partitionCustomerInsightMetrics(metrics)

    expect(result.operational.map((metric) => metric.label)).toEqual([
      '前回ご利用日',
      '前回ご利用のキャスト',
      '累計利用回数',
      'キャンセル回数(お客様)',
      'キャンセル回数(お店)',
    ])
    expect(result.other.map((metric) => metric.label)).toEqual([
      '客単価',
      'チャット累計数',
      '新しい追加指標',
    ])
    expect([...result.operational, ...result.other]).toHaveLength(metrics.length)
  })

  it('places the operational summary above reservations and other tendencies below them', () => {
    const summaryIndex = source.indexOf('予約受付サマリー')
    const reservationIndex = source.indexOf('現在の予約情報')
    const otherIndex = source.indexOf('その他の傾向')

    expect(summaryIndex).toBeGreaterThan(-1)
    expect(reservationIndex).toBeGreaterThan(summaryIndex)
    expect(otherIndex).toBeGreaterThan(reservationIndex)
    expect(source).toContain('metrics={operationalInsightMetrics}')
    expect(source).toContain('metrics={otherInsightMetrics}')
  })
})
