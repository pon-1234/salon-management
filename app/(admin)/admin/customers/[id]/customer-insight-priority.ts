/**
 * @design_doc   Customer detail information-priority contract for field reservation operations
 * @related_to   CustomerProfile insight summary presentation
 * @known_issues Store-scoped chat metrics remain unavailable until the message model carries store identity
 */

type LabeledMetric = {
  label: string
}

const OPERATIONAL_METRIC_ORDER = [
  '前回ご利用日',
  '前回ご利用のキャスト',
  '累計利用回数',
  'キャンセル回数(お客様)',
  'キャンセル回数(お店)',
] as const

const OTHER_METRIC_ORDER = [
  '客単価',
  '平均利用間隔',
  '累計価格',
  '好みのカップサイズ',
  '本日のチャット数',
  '昨日のチャット数',
  'チャット累計数',
] as const

function orderMetrics<T extends LabeledMetric>(
  metrics: readonly T[],
  preferredOrder: readonly string[]
): T[] {
  const preferredIndex = new Map(preferredOrder.map((label, index) => [label, index]))

  return metrics
    .map((metric, sourceIndex) => ({ metric, sourceIndex }))
    .sort((left, right) => {
      const leftIndex = preferredIndex.get(left.metric.label) ?? Number.POSITIVE_INFINITY
      const rightIndex = preferredIndex.get(right.metric.label) ?? Number.POSITIVE_INFINITY
      return leftIndex - rightIndex || left.sourceIndex - right.sourceIndex
    })
    .map(({ metric }) => metric)
}

/** Splits insight metrics without dropping unknown or future metrics from the customer page. */
export function partitionCustomerInsightMetrics<T extends LabeledMetric>(
  metrics: readonly T[]
): {
  operational: T[]
  other: T[]
} {
  const operationalLabels = new Set<string>(OPERATIONAL_METRIC_ORDER)
  const operational = metrics.filter((metric) => operationalLabels.has(metric.label))
  const other = metrics.filter((metric) => !operationalLabels.has(metric.label))

  return {
    operational: orderMetrics(operational, OPERATIONAL_METRIC_ORDER),
    other: orderMetrics(other, OTHER_METRIC_ORDER),
  }
}
