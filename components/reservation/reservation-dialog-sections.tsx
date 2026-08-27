'use client'

/**
 * @design_doc   Notion final revision requests #276 and phase 4 reservation dialog extraction
 * @related_to   ReservationDialog, ReservationData
 * @known_issues None currently
 */
import { Calculator, Calendar, Clock, Info } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ModificationHistoryTable } from './modification-history-table'
import { PAYMENT_METHODS } from '@/lib/constants'
import type { ModificationAlert, ModificationHistory } from '@/lib/types/modification-history'
import type { ReservationData } from '@/lib/types/reservation'
import { cn } from '@/lib/utils'
import {
  calculateReservationPriceBreakdown,
  formatCurrency,
  formatMinutes,
  normalizePaymentMethodValue,
  toNumber,
} from './reservation-dialog.utils'

type ReservationPrimarySummaryProps = {
  reservation: ReservationData
  castWorkStatus?: string | null
  courseName: string
  designationName: string
  optionNames: string[]
  canViewFinancialDetails: boolean
  hotelName: string
  roomNumber: string
  entrySending: boolean
  canSave: boolean
  onHotelNameChange: (value: string) => void
  onRoomNumberChange: (value: string) => void
  onSaveEntryInfo: () => void
}

export function ReservationPrimarySummary({
  reservation,
  castWorkStatus,
  courseName,
  designationName,
  optionNames,
  canViewFinancialDetails,
  hotelName,
  roomNumber,
  entrySending,
  canSave,
  onHotelNameChange,
  onRoomNumberChange,
  onSaveEntryInfo,
}: ReservationPrimarySummaryProps) {
  const paymentMethod = reservation.paymentMethod
    ? normalizePaymentMethodValue(reservation.paymentMethod)
    : null

  return (
    <div data-testid="reservation-primary-summary-grid" className="grid gap-3 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            <h3>日時・キャスト</h3>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-3xl font-bold tracking-tight">
            {format(reservation.startTime, 'HH:mm')} - {format(reservation.endTime, 'HH:mm')}
          </p>
          <p className="text-sm text-muted-foreground">
            {format(reservation.startTime, 'yyyy年MM月dd日(E)', { locale: ja })}
          </p>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{reservation.staff || 'キャスト未設定'}</span>
            {castWorkStatus ? (
              <Badge variant="secondary" className="text-xs">
                {castWorkStatus}
              </Badge>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            <h3>場所</h3>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="font-medium">
            {reservation.areaName || reservation.location || '未設定'}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label htmlFor="summary-hotel-name">ホテル名</Label>
              <Input
                id="summary-hotel-name"
                value={hotelName}
                onChange={(event) => onHotelNameChange(event.target.value)}
                placeholder="例: 渋谷グランドホテル"
                disabled={entrySending}
              />
            </div>
            <div>
              <Label htmlFor="summary-room-number">部屋番号</Label>
              <Input
                id="summary-room-number"
                value={roomNumber}
                onChange={(event) => onRoomNumberChange(event.target.value)}
                placeholder="例: 1203"
                disabled={entrySending}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onSaveEntryInfo}
              disabled={entrySending || !canSave}
            >
              更新
            </Button>
            <Button size="sm" onClick={onSaveEntryInfo} disabled={entrySending || !canSave}>
              女性に通知
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            <h3>予約詳細</h3>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <div className="text-muted-foreground">コース</div>
            <div className="font-medium">{courseName}</div>
          </div>
          <div>
            <div className="text-muted-foreground">指名</div>
            <div className="font-medium">{designationName}</div>
          </div>
          <div className="sm:col-span-2">
            <div className="text-muted-foreground">オプション</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {optionNames.length > 0 ? (
                optionNames.map((option) => (
                  <Badge key={option} variant="secondary" className="text-xs">
                    {option}
                  </Badge>
                ))
              ) : (
                <span className="font-medium">なし</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            <h3>料金・総額</h3>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {canViewFinancialDetails ? (
            <>
              <div className="flex items-center justify-between text-lg font-bold">
                <span>総額</span>
                <span>{formatCurrency(reservation.totalPayment)}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>支払い方法</span>
                <span>{paymentMethod || '未設定'}</span>
              </div>
              {paymentMethod === PAYMENT_METHODS.CARD ? (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>カード決済管理番号</span>
                  <span>{reservation.paymentReference || '未登録'}</span>
                </div>
              ) : null}
              <Separator />
              <div className="flex items-center justify-between text-muted-foreground">
                <span>店舗売上</span>
                <span>{formatCurrency(reservation.storeRevenue)}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>キャスト売上</span>
                <span>{formatCurrency(reservation.staffRevenue)}</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">売上情報は表示できません。</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

type ReservationDialogFooterProps = {
  isEditMode: boolean
  total: number
  priceDelta: number
  durationMinutes: number
  endTime: string
}

export function ReservationDialogFooter({
  isEditMode,
  total,
  priceDelta,
  durationMinutes,
  endTime,
}: ReservationDialogFooterProps) {
  return (
    <div className="border-t bg-white px-4 py-3 shadow-inner">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-baseline gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {isEditMode ? '変更後の合計' : '予約合計'}
            </p>
            <p className="text-xl font-semibold leading-none">{formatCurrency(total)}</p>
          </div>
          {isEditMode && priceDelta !== 0 ? (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-semibold',
                priceDelta > 0
                  ? 'bg-red-50 text-red-600 ring-1 ring-inset ring-red-200'
                  : 'bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200'
              )}
            >
              {priceDelta > 0 ? '+' : '-'}
              {formatCurrency(Math.abs(priceDelta))}
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">{formatMinutes(durationMinutes)}</p>
              <p>{isEditMode ? '変更後の施術時間' : '施術時間'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">{endTime}</p>
              <p>{isEditMode ? '変更後の終了予定' : '終了予定'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

type ReservationNotesAndConfirmationProps = {
  isEditMode: boolean
  notes: string
  staffConfirmation: string
  customerConfirmation: string
  onNotesChange: (value: string) => void
}

export function ReservationNotesAndConfirmation({
  isEditMode,
  notes,
  staffConfirmation,
  customerConfirmation,
  onNotesChange,
}: ReservationNotesAndConfirmationProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">詳細メモ</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditMode ? (
            <Textarea
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              rows={5}
              placeholder="予約に関する詳細メモを入力してください"
            />
          ) : notes ? (
            <p className="whitespace-pre-wrap text-sm">{notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground">詳細メモは登録されていません。</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">確認状況</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <div className="text-muted-foreground">担当キャスト確認</div>
            <div className="font-medium">{staffConfirmation}</div>
          </div>
          <div>
            <div className="text-muted-foreground">顧客確認</div>
            <div className="font-medium">{customerConfirmation}</div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

type ReservationHistoryContentProps = {
  isLoading: boolean
  modifications: ModificationHistory[]
  alerts: ModificationAlert[]
}

export function ReservationHistoryContent({
  isLoading,
  modifications,
  alerts,
}: ReservationHistoryContentProps) {
  return (
    <TabsContent value="history" className="space-y-4 p-4">
      <Alert variant="default" className="bg-muted/40">
        <Info className="h-4 w-4" />
        <AlertDescription>
          ステータス・時間帯・料金などの更新は自動で記録されます。スタッフ間の共有メモや監査対応の証跡として活用してください。
        </AlertDescription>
      </Alert>
      {isLoading ? <p className="text-xs text-muted-foreground">履歴を読み込み中...</p> : null}
      <ModificationHistoryTable modifications={modifications} alerts={alerts} />
    </TabsContent>
  )
}

type ReservationEditPricePreviewProps = {
  priceBreakdown: ReturnType<typeof calculateReservationPriceBreakdown>
  priceDelta: number
  originalTotal: number
  durationMinutes: number
  durationDelta: number
  originalDurationMinutes: number
  endTime: string
  options: Array<{
    id: string
    name: string
    note?: string | null
    duration?: number | null
    price?: unknown
  }>
}

export function ReservationEditPricePreview({
  priceBreakdown,
  priceDelta,
  originalTotal,
  durationMinutes,
  durationDelta,
  originalDurationMinutes,
  endTime,
  options,
}: ReservationEditPricePreviewProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">料金プレビュー</CardTitle>
        <Calculator className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-1">
          <div className="text-muted-foreground">変更後の合計</div>
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-2xl font-semibold">{formatCurrency(priceBreakdown.total)}</span>
            {priceDelta !== 0 ? (
              <span
                className={cn(
                  'text-sm font-semibold',
                  priceDelta > 0 ? 'text-red-600' : 'text-emerald-600'
                )}
              >
                {priceDelta > 0 ? '+' : '-'}
                {formatCurrency(Math.abs(priceDelta))}
              </span>
            ) : null}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>現在の金額</span>
            <span>{formatCurrency(originalTotal)}</span>
          </div>
        </div>

        <div className="space-y-1 pt-2">
          <div className="text-muted-foreground">施術時間</div>
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-lg font-semibold">{formatMinutes(durationMinutes)}</span>
            {durationDelta !== 0 ? (
              <span
                className={cn(
                  'text-sm font-semibold',
                  durationDelta > 0 ? 'text-orange-600' : 'text-emerald-600'
                )}
              >
                {durationDelta > 0 ? '+' : '-'}
                {formatMinutes(Math.abs(durationDelta))}
              </span>
            ) : null}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>現在の時間</span>
            <span>{formatMinutes(originalDurationMinutes)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>終了予定</span>
            <span>{endTime}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            内訳
          </div>
          <dl className="space-y-2">
            <div className="flex items-center justify-between">
              <dt>コース</dt>
              <dd>{formatCurrency(priceBreakdown.basePrice)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>オプション</dt>
              <dd>{formatCurrency(priceBreakdown.optionTotal)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>指名料</dt>
              <dd>{formatCurrency(priceBreakdown.designation)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>追加料金</dt>
              <dd>{formatCurrency(priceBreakdown.additional)}</dd>
            </div>
            {priceBreakdown.discount > 0 ? (
              <div className="flex items-center justify-between text-red-600">
                <dt>割引</dt>
                <dd>-{formatCurrency(priceBreakdown.discount)}</dd>
              </div>
            ) : null}
            {priceBreakdown.pointsUsed > 0 ? (
              <div className="flex items-center justify-between text-red-600">
                <dt>ポイント利用</dt>
                <dd>-{formatCurrency(priceBreakdown.pointsUsed)}</dd>
              </div>
            ) : null}
          </dl>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>選択オプション</span>
            <span>{options.length > 0 ? `${options.length}件` : 'なし'}</span>
          </div>
          {options.length > 0 ? (
            <ul className="divide-y divide-muted/40 overflow-hidden rounded-md border border-muted/40 text-xs">
              {options.map((option) => (
                <li
                  key={option.id}
                  className="flex items-center justify-between gap-3 bg-white/30 px-3 py-2"
                >
                  <div className="flex-1">
                    <div className="font-medium">{option.name}</div>
                    {option.note ? (
                      <div className="text-xs text-muted-foreground">{option.note}</div>
                    ) : null}
                  </div>
                  <div className="text-right text-muted-foreground">
                    {option.duration ? <div>{formatMinutes(option.duration)}</div> : null}
                    <div>{formatCurrency(toNumber(option.price, 0))}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">オプションは選択されていません。</p>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          変更内容は「保存する」で反映され、履歴にも記録されます。
        </p>
      </CardContent>
    </Card>
  )
}
