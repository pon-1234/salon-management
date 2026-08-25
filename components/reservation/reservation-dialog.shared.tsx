/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md D-1 reservation dialog split
 * @related_to   ReservationDialog consumes shared edit state, status metadata, and presentation helpers
 * @known_issues Entry metadata follows the reservation API's ISO date response contract
 */
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { PaymentMethod, ReservationStatus } from '@/lib/constants'
import type { ReservationData, ReservationSavePayload } from '@/lib/types/reservation'
import type { Cast } from '@/lib/cast/types'
import { getReservationStatusLabel } from '@/lib/reservation/status-display'

export { getReservationStatusLabel }

export interface ReservationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reservation: ReservationData | null | undefined
  onSave?: (reservationId: string, payload: ReservationSavePayload) => Promise<void> | void
  casts?: Cast[]
}

export type EditFormState = {
  date: string
  startTime: string
  castId: string
  courseId: string | null
  designationId: string
  storeMemo: string
  notes: string
  paymentMethod: PaymentMethod
  paymentReference: string
  marketingChannel: string
  transportationFee: number
  additionalFee: number
  discountAmount: number
  designationFee: number
  price: number
  areaId: string | null
  stationId: string | null
  optionIds: string[]
  hotelName: string
  roomNumber: string
  locationMemo: string
}

export type LineLogEntry = {
  id: string
  message: string
  status: 'sent' | 'failed' | string
  errorMessage: string | null
  createdAt: Date
  castName: string | null
}

const statusColorMap: Record<string, string> = {
  confirmed: 'bg-emerald-600',
  preconfirmed: 'bg-sky-600',
  modifiable: 'bg-orange-500',
  pending: 'bg-amber-500',
  tentative: 'bg-amber-500',
  cancelled: 'bg-red-500',
  completed: 'bg-blue-500',
}

export const STATUS_OPTIONS: Array<{
  value: ReservationStatus
  label: string
  description: string
}> = [
  {
    value: 'pending',
    label: '仮予約',
    description: '店が取った仮押さえ、またはネット予約。確定すると稼働中の処理対象になります。',
  },
  {
    value: 'modifiable',
    label: '修正待ち',
    description: '詳細調整が残っている予約です。仮予約と同じ優先枠で扱います。',
  },
  {
    value: 'confirmed',
    label: '確定',
    description: '顧客・店舗双方の確認が取れた状態です。',
  },
  {
    value: 'preconfirmed',
    label: '事前確認',
    description: '新規や先の予約など、確定前に内容確認が必要なときに使います。',
  },
  {
    value: 'completed',
    label: '完了',
    description: '施術完了後の入金・日報対象です。',
  },
  {
    value: 'cancelled',
    label: 'キャンセル',
    description: '顧客キャンセル・トラブル等で取り消す場合に使用します。',
  },
]

export const STATUS_META = STATUS_OPTIONS.reduce<
  Record<string, { label: string; description: string }>
>((acc, item) => {
  acc[item.value] = { label: item.label, description: item.description }
  return acc
}, {})

export const NG_REASON_LABELS: Record<'customer' | 'cast' | 'staff', string> = {
  customer: '顧客NG',
  cast: 'キャストNG',
  staff: '店舗NG',
}

export function StatusBadge({
  status,
  marketingChannel,
}: {
  status: ReservationStatus | 'completed' | string
  marketingChannel?: string | null
}) {
  const color = statusColorMap[status] ?? 'bg-gray-500'
  const label = getReservationStatusLabel(status, marketingChannel)
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold text-white shadow-sm',
        color
      )}
    >
      {label}
    </span>
  )
}

export function formatRemainingTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function parseEntryMeta(payload: {
  entryReceivedAt?: string | null
  entryReceivedBy?: string | null
  entryNotifiedAt?: string | null
  entryConfirmedAt?: string | null
  entryReminderSentAt?: string | null
}) {
  return {
    entryReceivedAt: payload?.entryReceivedAt ? new Date(payload.entryReceivedAt) : null,
    entryReceivedBy: payload?.entryReceivedBy ?? null,
    entryNotifiedAt: payload?.entryNotifiedAt ? new Date(payload.entryNotifiedAt) : null,
    entryConfirmedAt: payload?.entryConfirmedAt ? new Date(payload.entryConfirmedAt) : null,
    entryReminderSentAt: payload?.entryReminderSentAt
      ? new Date(payload.entryReminderSentAt)
      : null,
  }
}

export function cardPaymentReferenceClassName(value: string): string {
  return value.trim() ? 'border-emerald-400 bg-emerald-50' : 'border-amber-400 bg-amber-50'
}

export function ReservationCardPaymentReferenceInput({
  id,
  value,
  onChange,
}: {
  id: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <Label htmlFor={id}>カード決済管理番号を入力してください</Label>
      <Input
        id={id}
        aria-label="カード決済管理番号"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={100}
        autoComplete="off"
        placeholder="決済伝票の管理番号（カード番号は入力しない）"
        className={cardPaymentReferenceClassName(value)}
      />
    </div>
  )
}
