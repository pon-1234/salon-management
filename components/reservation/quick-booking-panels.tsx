/**
 * @design_doc   Notion #280 one-page reservation reception layout
 * @related_to   QuickBookingDialog supplies reservation state and pricing calculations
 * @known_issues None currently
 */
'use client'

import type { ReactNode } from 'react'
import { CreditCard } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  composeMarketingChannel,
  parseMarketingChannel,
} from '@/components/reservation/reservation-dialog.utils'
import { formatYen, type NormalizedCourse, type PriceBreakdown } from './quick-booking.utils'

export type ReceptionStaffOption = {
  id: string
  name: string
}

type ChannelGroups = {
  methods: string[]
  sites: string[]
}

export function QuickBookingPanelGrid({ children }: { children: ReactNode }) {
  return (
    <div
      data-testid="quick-booking-panel-grid"
      className="grid gap-3 pb-4 lg:grid-cols-2 lg:items-start"
    >
      {children}
    </div>
  )
}

type BookingOptionChoice = {
  id: string
  name: string
  price?: number
  note?: string | null
}

type OptionSelectorProps = {
  options: BookingOptionChoice[]
  selectedIds: string[]
  onOptionChange: (optionId: string, selected: boolean) => void
  testId?: string
}

export function QuickBookingOptionSelector({
  options,
  selectedIds,
  onOptionChange,
  testId = 'reservation-option-grid',
}: OptionSelectorProps) {
  return (
    <div data-testid={testId} className="grid grid-cols-1 gap-3">
      {options.length === 0 ? (
        <div className="rounded-lg bg-gray-50 p-4 text-center text-gray-500">
          利用可能なオプションがありません
        </div>
      ) : (
        options.map((option) => {
          const optionCheckboxId = `${testId}-${option.id}`
          const isSelected = selectedIds.includes(option.id)

          return (
            <Label
              key={option.id}
              htmlFor={optionCheckboxId}
              data-testid={`option-row-${option.id}`}
              className={`flex w-full cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              <span className="flex min-w-0 items-center">
                <Checkbox
                  id={optionCheckboxId}
                  checked={isSelected}
                  onCheckedChange={(checked) => onOptionChange(option.id, Boolean(checked))}
                />
                <span className="ml-3 min-w-0 font-medium">
                  {option.name}
                  {option.note ? (
                    <span className="ml-2 text-xs text-gray-500">({option.note})</span>
                  ) : null}
                </span>
              </span>
              {typeof option.price === 'number' ? (
                <Badge variant="secondary" className="ml-3 shrink-0">
                  {option.price === 0 ? '無料' : `+${option.price.toLocaleString()}円`}
                </Badge>
              ) : null}
            </Label>
          )
        })
      )}
    </div>
  )
}

type CourseSelectorProps = {
  loading: boolean
  courses: NormalizedCourse[]
  selectedIds: [string, string, string]
  onSelectionChange: (index: number, courseId: string) => void
}

export function QuickBookingCourseSelector({
  loading,
  courses,
  selectedIds,
  onSelectionChange,
}: CourseSelectorProps) {
  return (
    <div>
      <Label>コース選択</Label>
      {loading ? (
        <div className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-500">
          読み込み中...
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-500">
          利用可能なコースがありません
        </div>
      ) : (
        <div className="space-y-2">
          {selectedIds.map((selectedId, index) => (
            <select
              key={index}
              aria-label={`コース${index + 1}`}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedId}
              onChange={(event) => onSelectionChange(index, event.target.value)}
            >
              {index > 0 ? <option value="">追加コースなし</option> : null}
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}（{course.duration}分 / {course.price.toLocaleString()}円）
                </option>
              ))}
            </select>
          ))}
        </div>
      )}
    </div>
  )
}

type VisitDetailsProps = {
  hotelName: string
  roomNumber: string
  locationMemo: string
  onChange: (field: 'hotelName' | 'roomNumber' | 'locationMemo', value: string) => void
}

export function QuickBookingVisitDetails({
  hotelName,
  roomNumber,
  locationMemo,
  onChange,
}: VisitDetailsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="quick-booking-hotel-name">ホテル名</Label>
          <Input
            id="quick-booking-hotel-name"
            value={hotelName}
            onChange={(event) => onChange('hotelName', event.target.value)}
            placeholder="例: 池袋ホテル"
          />
        </div>
        <div>
          <Label htmlFor="quick-booking-room-number">部屋番号</Label>
          <Input
            id="quick-booking-room-number"
            value={roomNumber}
            onChange={(event) => onChange('roomNumber', event.target.value)}
            placeholder="例: 1203"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="quick-booking-location-memo">訪問先メモ</Label>
        <Textarea
          id="quick-booking-location-memo"
          value={locationMemo}
          onChange={(event) => onChange('locationMemo', event.target.value)}
          placeholder="訪問先の目印や注意事項"
          rows={2}
          className="max-h-24 overflow-y-auto"
        />
      </div>
    </>
  )
}

type ReceptionPanelProps = {
  marketingChannel: string
  channelGroups: ChannelGroups
  receptionStaffId: string
  receptionStaffOptions: ReceptionStaffOption[]
  bookingStatus: string
  notes: string
  onMarketingChannelChange: (value: string) => void
  onReceptionStaffChange: (value: string) => void
  onBookingStatusChange: (value: string) => void
  onNotesChange: (value: string) => void
}

export function QuickBookingReceptionPanel({
  marketingChannel,
  channelGroups,
  receptionStaffId,
  receptionStaffOptions,
  bookingStatus,
  notes,
  onMarketingChannelChange,
  onReceptionStaffChange,
  onBookingStatusChange,
  onNotesChange,
}: ReceptionPanelProps) {
  const parsedChannel = parseMarketingChannel(marketingChannel)

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center">
          <CreditCard className="mr-2 h-5 w-5" />
          集客・受付情報
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="quick-booking-acquisition-method">集客手段</Label>
            <Select
              value={parsedChannel.method || undefined}
              onValueChange={(value) =>
                onMarketingChannelChange(composeMarketingChannel(value, parsedChannel.site))
              }
            >
              <SelectTrigger id="quick-booking-acquisition-method">
                <SelectValue placeholder="手段を選択" />
              </SelectTrigger>
              <SelectContent>
                {channelGroups.methods.map((channel) => (
                  <SelectItem key={channel} value={channel}>
                    {channel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="quick-booking-marketing-channel">集客チャンネル</Label>
            <Select
              value={parsedChannel.site ?? '__none__'}
              onValueChange={(value) =>
                onMarketingChannelChange(
                  composeMarketingChannel(parsedChannel.method, value === '__none__' ? null : value)
                )
              }
            >
              <SelectTrigger id="quick-booking-marketing-channel">
                <SelectValue placeholder="チャンネルを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">なし</SelectItem>
                {channelGroups.sites.map((channel) => (
                  <SelectItem key={channel} value={channel}>
                    {channel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="quick-booking-reception-staff">受付担当者</Label>
          <select
            id="quick-booking-reception-staff"
            aria-label="受付担当者"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={receptionStaffId}
            onChange={(event) => onReceptionStaffChange(event.target.value)}
          >
            <option value="">未選択</option>
            {receptionStaffOptions.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.name}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border p-3">
          <Label htmlFor="quick-booking-status" className="text-sm font-medium">
            予約ステータス
          </Label>
          <p className="mb-2 text-xs text-gray-500">新規は事前確認、リピートは確定が初期値です。</p>
          <select
            id="quick-booking-status"
            aria-label="予約ステータス"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={bookingStatus}
            onChange={(event) => onBookingStatusChange(event.target.value)}
          >
            <option value="仮予約">仮予約</option>
            <option value="事前確認">事前確認</option>
            <option value="確定済">確定</option>
          </select>
        </div>

        <div>
          <Label htmlFor="quick-booking-notes">店舗メモ</Label>
          <Textarea
            id="quick-booking-notes"
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder="店舗用メモがあれば記載してください"
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export function QuickBookingPricePanel({
  priceBreakdown,
  designationName,
}: {
  priceBreakdown: PriceBreakdown
  designationName: string
}) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle>料金内訳</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <PriceRow label="基本料金" value={priceBreakdown.basePrice} />
          <PriceRow label={`${designationName}料`} value={priceBreakdown.designationFee} />
          <PriceRow label="オプション" value={priceBreakdown.optionsTotal} />
          <PriceRow label="追加料金" value={priceBreakdown.additionalFee} />
          <PriceRow label="割引" value={priceBreakdown.discount} negative />
          <PriceRow label="小計" value={priceBreakdown.subtotal} muted />
          <PriceRow label="ポイント利用" value={priceBreakdown.pointsApplied} negative accent />
          {priceBreakdown.creditCardFee > 0 ? (
            <PriceRow label="クレジット手数料" value={priceBreakdown.creditCardFee} />
          ) : null}
          <hr className="my-2" />
          <div className="flex justify-between text-lg font-bold">
            <span>合計</span>
            <span>{formatYen(priceBreakdown.total)}</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-4 text-xs text-gray-500">
            <div className="rounded-md bg-gray-100 p-2">
              店舗売上: {formatYen(priceBreakdown.storeRevenue)}
            </div>
            <div className="rounded-md bg-gray-100 p-2">
              キャスト売上: {formatYen(priceBreakdown.staffRevenue)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PriceRow({
  label,
  value,
  negative = false,
  muted = false,
  accent = false,
}: {
  label: string
  value: number
  negative?: boolean
  muted?: boolean
  accent?: boolean
}) {
  const className = accent
    ? 'text-emerald-600'
    : negative
      ? 'text-red-600'
      : muted
        ? 'text-gray-600'
        : ''
  return (
    <div className={`flex justify-between ${className}`}>
      <span>{label}</span>
      <span>
        {negative ? '-' : ''}
        {formatYen(value)}
      </span>
    </div>
  )
}
