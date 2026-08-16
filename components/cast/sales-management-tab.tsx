/**
 * @design_doc   Cast sales tab backed by store-scoped production settlement records
 * @related_to   CastSettlementsData and the admin cast settlements API
 * @known_issues The API currently exposes the current month only
 */
'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import { AlertCircle, Calendar, DollarSign, Loader2, Store, User } from 'lucide-react'
import type { CastSettlementRecordDetail, CastSettlementsData } from '@/lib/cast-portal/types'
import { useStore } from '@/contexts/store-context'
import { buildStoreScopedEndpoint } from '@/lib/store/endpoints'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const JST_TIMEZONE = 'Asia/Tokyo'

interface SalesManagementTabProps {
  castId: string
  castName: string
}

const settlementStatusLabel = {
  pending: '未精算',
  partial: '一部精算',
  settled: '精算済み',
} as const

const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null
const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isSettlementOption = (value: unknown) =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  isNumber(value.price) &&
  (value.storeShare === undefined || isNumber(value.storeShare)) &&
  (value.castShare === undefined || isNumber(value.castShare))

const isSettlementRecord = (value: unknown) =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.startTime === 'string' &&
  !Number.isNaN(Date.parse(value.startTime)) &&
  typeof value.status === 'string' &&
  (value.settlementStatus === undefined ||
    value.settlementStatus === 'pending' ||
    value.settlementStatus === 'partial' ||
    value.settlementStatus === 'settled') &&
  (value.courseName === null || typeof value.courseName === 'string') &&
  (value.courseDuration === null || isNumber(value.courseDuration)) &&
  isNumber(value.price) &&
  isNumber(value.staffRevenue) &&
  isNumber(value.storeRevenue) &&
  isNumber(value.welfareExpense) &&
  isNumber(value.designationFee) &&
  isNumber(value.transportationFee) &&
  isNumber(value.additionalFee) &&
  isNumber(value.discountAmount) &&
  Array.isArray(value.options) &&
  value.options.every(isSettlementOption)

const isCastSettlementsData = (value: unknown): value is CastSettlementsData => {
  if (!isRecord(value) || !isRecord(value.summary) || !Array.isArray(value.days)) return false
  const summary = value.summary
  if (
    typeof summary.month !== 'string' ||
    !isNumber(summary.totalRevenue) ||
    !isNumber(summary.staffRevenue) ||
    !isNumber(summary.storeRevenue) ||
    !isNumber(summary.welfareExpense) ||
    !isNumber(summary.completedCount) ||
    !isNumber(summary.pendingCount)
  ) {
    return false
  }

  return value.days.every(
    (day) =>
      isRecord(day) &&
      typeof day.date === 'string' &&
      isNumber(day.totalRevenue) &&
      isNumber(day.reservationCount) &&
      Array.isArray(day.records) &&
      day.records.every(isSettlementRecord)
  )
}

const formatMonth = (month: string) => {
  const match = month.match(/^(\d{4})-(\d{2})$/)
  return match ? `${Number(match[1])}年${Number(match[2])}月` : month
}

export function SalesManagementTab({ castId, castName }: SalesManagementTabProps) {
  const { currentStore } = useStore()
  const [data, setData] = useState<CastSettlementsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let ignore = false

    const load = async () => {
      setIsLoading(true)
      setError(null)
      setData(null)

      try {
        const now = new Date()
        const year = Number(formatInTimeZone(now, JST_TIMEZONE, 'yyyy'))
        const month = Number(formatInTimeZone(now, JST_TIMEZONE, 'M'))
        const endpoint = buildStoreScopedEndpoint(
          `/api/admin/cast/settlements?castId=${encodeURIComponent(castId)}&year=${year}&month=${month}`,
          currentStore.id
        )
        const response = await fetch(endpoint, { cache: 'no-store' })
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload.error ?? payload.message ?? '売上情報の取得に失敗しました。')
        }

        const payload: unknown = await response.json()
        if (!isCastSettlementsData(payload)) {
          throw new Error('売上情報の応答形式が不正です。')
        }

        if (!ignore) {
          setData(payload)
        }
      } catch (caught) {
        if (!ignore) {
          setError(caught instanceof Error ? caught.message : '売上情報の取得に失敗しました。')
        }
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      ignore = true
    }
  }, [castId, currentStore.id])

  const records = useMemo(
    () =>
      data?.days.flatMap((day) => day.records).filter((record) => record.status !== 'cancelled') ??
      [],
    [data]
  )
  const totals = useMemo(
    () =>
      records.reduce(
        (summary, record) => ({
          totalRevenue: summary.totalRevenue + record.price,
          staffRevenue: summary.staffRevenue + record.staffRevenue,
          storeRevenue: summary.storeRevenue + record.storeRevenue,
        }),
        { totalRevenue: 0, staffRevenue: 0, storeRevenue: 0 }
      ),
    [records]
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{castName}さんの売上管理</h2>
        <p className="text-sm text-muted-foreground">
          {data ? `${formatMonth(data.summary.month)}の予約売上` : '当月の予約売上を集計します。'}
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            売上情報を読み込んでいます...
          </CardContent>
        </Card>
      ) : error ? (
        <Card role="alert" className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center gap-2 py-6 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </CardContent>
        </Card>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <SummaryCard
              icon={DollarSign}
              label="総売上"
              value={formatCurrency(totals.totalRevenue)}
            />
            <SummaryCard
              icon={User}
              label="キャスト売上"
              value={formatCurrency(totals.staffRevenue)}
            />
            <SummaryCard
              icon={Store}
              label="店舗売上"
              value={formatCurrency(totals.storeRevenue)}
            />
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-lg">予約別売上</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  実予約から自動集計
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {records.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  <Calendar className="mx-auto mb-2 h-10 w-10 text-muted-foreground/40" />
                  今月の売上データはありません
                </div>
              ) : (
                <SalesRecordsTable records={records} />
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof DollarSign
  label: string
  value: string
}) {
  return (
    <Card data-slot="card">
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SalesRecordsTable({ records }: { records: CastSettlementRecordDetail[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>日時</TableHead>
          <TableHead>コース・オプション</TableHead>
          <TableHead className="text-right">総売上</TableHead>
          <TableHead className="text-right">キャスト売上</TableHead>
          <TableHead className="text-right">店舗売上</TableHead>
          <TableHead>精算状況</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((record) => {
          const settlementStatus = record.settlementStatus ?? 'pending'
          const startTime = new Date(record.startTime)
          return (
            <TableRow key={record.id}>
              <TableCell className="whitespace-nowrap">
                <div>{formatInTimeZone(startTime, JST_TIMEZONE, 'M/d')}</div>
                <div className="text-xs text-muted-foreground">
                  {formatInTimeZone(startTime, JST_TIMEZONE, 'HH:mm')}
                </div>
              </TableCell>
              <TableCell>
                <div className="font-medium">{record.courseName ?? 'コース未設定'}</div>
                {record.courseDuration ? (
                  <div className="text-xs text-muted-foreground">{record.courseDuration}分</div>
                ) : null}
                {record.options.map((option) => (
                  <div key={`${record.id}-${option.id}`} className="text-xs text-muted-foreground">
                    {option.name}（{formatCurrency(option.price)}）
                  </div>
                ))}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(record.price)}
              </TableCell>
              <TableCell className="text-right">{formatCurrency(record.staffRevenue)}</TableCell>
              <TableCell className="text-right">{formatCurrency(record.storeRevenue)}</TableCell>
              <TableCell>
                <Badge variant={settlementStatus === 'settled' ? 'secondary' : 'outline'}>
                  {settlementStatusLabel[settlementStatus]}
                </Badge>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
