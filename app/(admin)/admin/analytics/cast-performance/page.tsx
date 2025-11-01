'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Printer,
  Sparkles,
  Filter as FilterIcon,
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
    <div className="space-y-8">
      <Card className="border-none bg-gradient-to-br from-purple-600 via-indigo-500 to-sky-500 text-white shadow-xl">
        <CardContent className="flex flex-col gap-6 p-6 pb-8 md:flex-row md:items-end md:justify-between md:p-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/80">
              <Sparkles className="h-4 w-4" />
              キャスト実績ダッシュボード
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">キャスト実績概要</h1>
              <p className="max-w-2xl text-sm leading-relaxed text-white/85">
                稼働状況・売上・指名状況を統合したキャストパフォーマンスレポートです。評価面談やシフト計画の意思決定をスムーズにします。
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 rounded-xl border border-white/20 bg-white/10 p-4 text-sm md:w-64">
            <div className="flex items-center justify-between font-medium">
              <span className="text-white/75">対象期間</span>
              <span>{periodLabel}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-white/75">表示条件</span>
              <span>{displayType}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-white/75">キャスト</span>
              <span>{selectedCastLabel}</span>
            </div>
            {hasCustomFilters && (
              <Button
                variant="ghost"
                className="h-9 justify-center rounded-lg border border-white/30 bg-white/10 text-white hover:bg-white/20"
                onClick={handleResetFilters}
              >
                <RotateCcw className="h-4 w-4" />
                条件をリセット
              </Button>
            )}
            <Button
              onClick={handlePrint}
              variant="ghost"
              className="h-9 justify-center rounded-lg border border-white/30 bg-white/10 text-white hover:bg-white/20 print:hidden"
            >
              <Printer className="h-4 w-4" />
              印刷する
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="space-y-1 border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <FilterIcon className="h-4 w-4 text-muted-foreground" />
            集計条件
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            年月・表示区分・キャストで絞り込みが可能です。フィルター変更後は各指標が即時に再集計されます。
          </p>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="cast-performance-year">対象年</Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger id="cast-performance-year">
                  <SelectValue placeholder="年を選択" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}年
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cast-performance-month">対象月</Label>
              <Select
                value={selectedMonth.toString()}
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
              >
                <SelectTrigger id="cast-performance-month">
                  <SelectValue placeholder="月を選択" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month} value={month.toString()}>
                      {month}月
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cast-performance-display">表示区分</Label>
              <Select id="cast-performance-display" value={displayType} onValueChange={setDisplayType}>
                <SelectTrigger>
                  <SelectValue placeholder="表示区分を選択" />
                </SelectTrigger>
                <SelectContent>
                  {displayTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                シフト状況ごとの絞り込み（出勤・休み・当日欠勤）を切り替えできます。
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cast-performance-cast">キャスト</Label>
              <Select id="cast-performance-cast" value={selectedCast} onValueChange={setSelectedCast}>
                <SelectTrigger>
                  <SelectValue placeholder="全キャスト" />
                </SelectTrigger>
                <SelectContent>
                  {castList.map((cast) => (
                    <SelectItem key={cast} value={cast}>
                      {cast === '----------' ? '全キャスト' : cast}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">個別面談や評価時の比較に。</p>
            </div>
          </div>
          <Separator />
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>表示対象: {displayType}</span>
            <span>キャスト: {selectedCastLabel}</span>
            <span>期間: {periodLabel}</span>
          </div>
        </CardContent>
      </Card>

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
