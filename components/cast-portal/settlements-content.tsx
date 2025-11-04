'use client'

import { useCallback, useState, useTransition } from 'react'
import { format } from 'date-fns'
import { Loader2, PiggyBank, Receipt, Shield } from 'lucide-react'
import type { CastSettlementsData } from '@/lib/cast-portal/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'

export function CastSettlementsContent({ initialData }: { initialData: CastSettlementsData }) {
  const [data, setData] = useState(initialData)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const handleRefresh = useCallback(() => {
    startTransition(async () => {
      try {
        const response = await fetch('/api/cast-portal/settlements', { cache: 'no-store' })
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload.error ?? '精算データの取得に失敗しました。')
        }
        const payload = (await response.json()) as CastSettlementsData
        setData(payload)
        toast({ title: '最新の精算情報に更新しました。' })
      } catch (error) {
        toast({
          title: '更新に失敗しました',
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        })
      }
    })
  }, [toast])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">精算・売上</h2>
          <p className="text-sm text-muted-foreground">今月の売上と精算状況をリアルタイムで確認できます。</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          更新
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryTile
          icon={PiggyBank}
          title="今月の取り分"
          value={`¥${data.summary.staffRevenue.toLocaleString()}`}
          helper={`総売上 ¥${data.summary.totalRevenue.toLocaleString()}`}
        />
        <SummaryTile
          icon={Shield}
          title="厚生費累計"
          value={`¥${data.summary.welfareExpense.toLocaleString()}`}
          helper="雑費（厚生費）を含む控除合計"
        />
        <SummaryTile
          icon={Receipt}
          title="精算状況"
          value={`${data.summary.completedCount} 件 完了`}
          helper={`未精算 ${data.summary.pendingCount} 件`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">最新の精算履歴</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {data.recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">今月の精算データはまだありません。</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">日時</TableHead>
                  <TableHead className="whitespace-nowrap">コース</TableHead>
                  <TableHead className="whitespace-nowrap">売上</TableHead>
                  <TableHead className="whitespace-nowrap">取り分</TableHead>
                  <TableHead className="whitespace-nowrap">厚生費</TableHead>
                  <TableHead className="whitespace-nowrap">ステータス</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recent.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {format(new Date(row.startTime), 'MM/dd HH:mm')}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-sm">
                      {row.courseName ?? 'コース未設定'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm font-medium">
                      ¥{row.price.toLocaleString()}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      ¥{row.staffRevenue.toLocaleString()}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      ¥{row.welfareExpense.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {row.status === 'completed' ? (
                        <Badge variant="outline" className="border-emerald-200 text-emerald-600">
                          精算済み
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-200 text-amber-600">
                          未精算
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryTile({
  icon: Icon,
  title,
  value,
  helper,
}: {
  icon: typeof PiggyBank
  title: string
  value: string
  helper?: string
}) {
  return (
    <Card className="border border-primary/10 bg-white">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold text-foreground">{value}</div>
        {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
      </CardContent>
    </Card>
  )
}
