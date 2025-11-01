'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Printer,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Users,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CastPerformanceTable } from '@/components/analytics/cast-performance-table'
import { AnalyticsUseCases } from '@/lib/analytics/usecases'
import { AnalyticsRepositoryImpl } from '@/lib/analytics/repository'

const analyticsRepository = new AnalyticsRepositoryImpl()
const analyticsUseCases = new AnalyticsUseCases(analyticsRepository)

export default function CastPerformancePage() {
  const now = new Date()
  const defaultYear = now.getFullYear()
  const defaultMonth = now.getMonth() + 1

  const [selectedYear, setSelectedYear] = useState(defaultYear)
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth)
  const [displayType, setDisplayType] = useState('全て表示')
  const [selectedCast, setSelectedCast] = useState('')

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const displayTypes = ['全て表示', '出勤のみ', '休みのみ']
  const castList = ['----------', 'きょうか', 'れいな', 'はるひ']

  const handlePrint = () => {
    window.print()
  }

  const handleResetFilters = () => {
    setSelectedYear(defaultYear)
    setSelectedMonth(defaultMonth)
    setDisplayType('全て表示')
    setSelectedCast('')
  }

  const periodLabel = useMemo(
    () => `${selectedYear}年${selectedMonth}月`,
    [selectedMonth, selectedYear]
  )

  const castFilterActive = selectedCast !== '' && selectedCast !== '----------'
  const selectedCastLabel = castFilterActive ? selectedCast : '全キャスト'
  const hasCustomFilters =
    displayType !== '全て表示' ||
    castFilterActive ||
    selectedYear !== defaultYear ||
    selectedMonth !== defaultMonth

  const lastUpdated = useMemo(() => new Date(), [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-2xl font-bold">キャスト実績</h1>
          <div className="flex flex-wrap gap-2">
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}年
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedMonth.toString()}
              onValueChange={(value) => setSelectedMonth(parseInt(value))}
            >
              <SelectTrigger className="w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month} value={month.toString()}>
                    {month}月
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={displayType} onValueChange={setDisplayType}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {displayTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedCast} onValueChange={setSelectedCast}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="キャスト：" />
              </SelectTrigger>
              <SelectContent>
                {castList.map((cast) => (
                  <SelectItem key={cast} value={cast}>
                    {cast}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {hasCustomFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="flex items-center gap-1"
            >
              <RotateCcw className="h-4 w-4" />
              条件をリセット
            </Button>
          )}
          <Button
            onClick={handlePrint}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Printer className="mr-2 h-4 w-4" />
            印刷する
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>対象期間: {periodLabel}</span>
        <span>表示: {displayType}</span>
        <span>キャスト: {selectedCastLabel}</span>
        <span>
          最終更新:{' '}
          {lastUpdated.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-700">
        ※ 厚生費は未払いも含めて全て表示しています
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <CastPerformanceTable analyticsUseCases={analyticsUseCases} />
        </div>
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="space-y-2">
              <CardTitle className="text-base font-semibold">運用メモ</CardTitle>
              <p className="text-sm text-muted-foreground">
                集計結果を活用する際のポイントをまとめています。月次会議や個別評価の際にご確認ください。
              </p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3 rounded-lg border-l-4 border-emerald-200 bg-emerald-50/70 p-3 text-emerald-700">
                <Users className="mt-0.5 h-4 w-4" />
                <div>
                  <p className="font-semibold text-emerald-800">稼働キャストの変化に注目</p>
                  <p>
                    稼働日数・時間の推移は離職リスクの早期発見につながります。前月と比較し、稼働が急減しているキャストをフォローしましょう。
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border-l-4 border-indigo-200 bg-indigo-50/70 p-3 text-indigo-700">
                <Sparkles className="mt-0.5 h-4 w-4" />
                <div>
                  <p className="font-semibold text-indigo-800">指名・新規のバランスをチェック</p>
                  <p>
                    指名率と新規獲得率を併せて確認し、育成施策（クロスセル・リピート化）の優先度を判断してください。
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border-l-4 border-amber-200 bg-amber-50/70 p-3 text-amber-700">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div>
                  <p className="font-semibold text-amber-800">厚生費・割引の管理</p>
                  <p>
                    厚生費には未払い分も含まれます。未処理が続く場合は経理担当と連携し、決済漏れや精算遅延の有無を確認しましょう。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="space-y-2">
              <CardTitle className="text-base font-semibold">レポートの補足情報</CardTitle>
              <p className="text-sm text-muted-foreground">
                数値の読み方を揃えることで、会議での議論がスムーズになります。
              </p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                <div>
                  <p className="font-semibold text-foreground">厚生費の内訳</p>
                  <p>未払いや立替を含むため、経理確定前の速報値である点に留意してください。</p>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3 leading-relaxed">
                <p className="font-semibold text-foreground">最終更新</p>
                <p>
                  {lastUpdated.toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3 leading-relaxed">
                <p className="font-semibold text-foreground">主な活用シーン</p>
                <ul className="list-disc pl-5">
                  <li>月次報告会での実績共有</li>
                  <li>キャスト面談時の評価資料</li>
                  <li>人件費と売上のバランス確認</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
