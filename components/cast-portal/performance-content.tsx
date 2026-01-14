'use client'

import { useMemo } from 'react'
import { Trophy, Crown, Eye, Info } from 'lucide-react'
import type { CastPerformanceSnapshot, CastRankingMetric } from '@/lib/cast-portal/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WorkPerformanceTab } from '@/components/cast/work-performance-tab'
import { cn } from '@/lib/utils'

interface Props {
  initialData: CastPerformanceSnapshot
}

export function CastPerformanceContent({ initialData }: Props) {
  const metrics = useMemo(
    () => [initialData.totalDesignation, initialData.regularDesignation, initialData.access],
    [initialData]
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">ランキング / 成績</p>
          <h2 className="text-2xl font-semibold text-foreground">{initialData.cast.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{initialData.cast.storeName ?? '店舗未設定'}</Badge>
          <Badge variant="outline">{initialData.periodLabel} 集計</Badge>
        </div>
      </div>

      <Tabs defaultValue="ranking" className="space-y-6">
        <TabsList>
          <TabsTrigger value="ranking">ランキング</TabsTrigger>
          <TabsTrigger value="performance">成績</TabsTrigger>
        </TabsList>

        <TabsContent value="ranking" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {metrics.map((metric) => (
              <RankingCard
                key={metric.label}
                metric={metric}
                totalCastCount={initialData.totalCastCount}
              />
            ))}
          </div>
          <Card className="border-dashed">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium text-muted-foreground">
                集計について
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              今月の予約実績を元に算出しています。アクセス数は外部連携の準備が整い次第反映します。
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <WorkPerformanceTab castId={initialData.cast.id} castName={initialData.cast.name} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function RankingCard({
  metric,
  totalCastCount,
}: {
  metric: CastRankingMetric
  totalCastCount: number
}) {
  const rankLabel =
    metric.rank && totalCastCount > 0 ? `${metric.rank}位 / ${totalCastCount}人` : '集計中'
  const countLabel = metric.count != null ? `${metric.count}件` : '集計中'
  const Icon = metric.label.includes('アクセス')
    ? Eye
    : metric.label.includes('本指名')
      ? Crown
      : Trophy

  return (
    <Card className="border border-primary/10 bg-white">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-2xl font-semibold text-foreground">{rankLabel}</div>
        <div className={cn('text-xs text-muted-foreground', metric.count == null && 'italic')}>
          指標: {countLabel}
        </div>
      </CardContent>
    </Card>
  )
}
