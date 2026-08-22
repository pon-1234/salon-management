/**
 * @design_doc   docs/LEGACY_GOLD_ADMIN_MIGRATION_INVENTORY.md cast settlement management
 * @related_to   PaymentHistoryTab, SettlementStatusTab, allocateSettlementAmount
 * @known_issues Legacy settlement totals require production-data reconciliation
 */
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
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
import type { CastSettlementRecordDetail, SettlementPaymentDto } from '@/lib/cast-portal/types'
import { persistSettlementMethod } from '@/lib/payment/method-labels'
import { settlementPaidAtIso, settlementPaidAtParts } from '@/lib/settlement/clock'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

function currentOperatorLabel(name?: string | null, email?: string | null): string {
  if (name?.trim()) return name.trim()
  if (email?.trim()) return email.trim()
  return '管理者'
}

export const settlementStatusPresentation = {
  pending: {
    label: '未精算',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  partial: {
    label: '一部精算',
    className: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  settled: {
    label: '精算済み',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
} as const

export type PaymentRecordSubmitData = {
  amount: number
  method: string
  handledBy: string
  paidAt: string
  reservationIds: string[]
  notes?: string | null
}

type PaymentRecordFormState = {
  date: string
  time: string
  paymentType: string
  reservationIds: string[]
  handledBy: string
  notes: string
}

interface PaymentRecordFormProps {
  onSubmit: (data: PaymentRecordSubmitData) => void | Promise<void>
  reservations: CastSettlementRecordDetail[]
  initialData?: Partial<SettlementPaymentDto>
  isSubmitting?: boolean
}

export function PaymentRecordForm({
  onSubmit,
  reservations,
  initialData,
  isSubmitting = false,
}: PaymentRecordFormProps) {
  const { data: session } = useSession()
  const operatorLabel = currentOperatorLabel(session?.user?.name, session?.user?.email)
  const openedAt = useMemo(() => settlementPaidAtParts(), [])
  const eligibleReservationIds = useMemo(
    () => new Set(reservations.map((reservation) => reservation.id)),
    [reservations]
  )
  const allReservationIds = useMemo(
    () => reservations.map((reservation) => reservation.id),
    [reservations]
  )
  const initialClock = initialData?.paidAt
    ? settlementPaidAtParts(new Date(initialData.paidAt))
    : openedAt
  const [formData, setFormData] = useState<PaymentRecordFormState>({
    date: initialClock.date,
    time: initialClock.time,
    paymentType: persistSettlementMethod(initialData?.method) || '現金',
    reservationIds:
      initialData?.reservations
        ?.map((reservation) => reservation.id)
        .filter((reservationId) => eligibleReservationIds.has(reservationId)) || allReservationIds,
    handledBy: initialData?.handledBy || operatorLabel,
    notes: initialData?.notes || '',
  })

  const selectedSalesTotal = useMemo(
    () =>
      reservations
        .filter((record) => formData.reservationIds.includes(record.id))
        .reduce((sum, record) => sum + (record.unpaidAmount ?? record.staffRevenue), 0),
    [formData.reservationIds, reservations]
  )
  const [amount, setAmount] = useState(selectedSalesTotal)
  useEffect(() => {
    setAmount(selectedSalesTotal)
  }, [selectedSalesTotal])
  useEffect(() => {
    setFormData((current) =>
      current.handledBy.trim() ? current : { ...current, handledBy: operatorLabel }
    )
  }, [operatorLabel])
  const hasSelectedReservations = formData.reservationIds.length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasSelectedReservations || amount <= 0 || amount > selectedSalesTotal) return

    const dateTimeIso = settlementPaidAtIso(formData.date, formData.time)
    void onSubmit({
      amount,
      method: persistSettlementMethod(formData.paymentType),
      handledBy: formData.handledBy.trim() || operatorLabel,
      paidAt: dateTimeIso,
      reservationIds: formData.reservationIds,
      notes: formData.notes,
    })
  }

  const handleReservationToggle = (recordId: string) => {
    setFormData((current) => ({
      ...current,
      reservationIds: current.reservationIds.includes(recordId)
        ? current.reservationIds.filter((id) => id !== recordId)
        : [...current.reservationIds, recordId],
    }))
  }

  const selectAllUnpaid = () => {
    setFormData((current) => ({
      ...current,
      reservationIds: allReservationIds,
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        一括は対象を変えずに確定、一筆は残したい予約だけチェック、一部金額は「今回精算する額」を減らします。古い予約から充当します。
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="date">支払日</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="time">時間</Label>
          <Input
            id="time"
            type="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="paymentType">支払方法</Label>
          <Select
            value={formData.paymentType}
            onValueChange={(value) => setFormData({ ...formData, paymentType: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="現金">現金</SelectItem>
              <SelectItem value="振込">振込</SelectItem>
              <SelectItem value="その他">その他</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>処理者</Label>
          <p className="mt-2 text-sm font-medium">{formData.handledBy || operatorLabel}</p>
        </div>
      </div>

      <div>
        <Label htmlFor="amount">今回精算する額</Label>
        <Input
          id="amount"
          type="number"
          min={1}
          max={selectedSalesTotal}
          value={amount}
          onChange={(event) => setAmount(Number(event.target.value) || 0)}
          aria-describedby="settlement-amount-help"
          required
        />
        <p id="settlement-amount-help" className="mt-1 text-sm text-gray-600">
          未精算合計 ¥{selectedSalesTotal.toLocaleString()}
          {amount < selectedSalesTotal
            ? ` ／ 精算後残額 ¥${Math.max(selectedSalesTotal - amount, 0).toLocaleString()}`
            : ''}
          。古い予約から順に充当します。
        </p>
      </div>

      {reservations.length > 0 ? (
        <div>
          <div className="flex items-center justify-between gap-2">
            <Label>対象予約</Label>
            <Button type="button" variant="outline" size="sm" onClick={selectAllUnpaid}>
              未精算全件を入れる
            </Button>
          </div>
          <div className="mt-2 max-h-40 overflow-y-auto rounded-md border p-2">
            {reservations.map((record) => (
              <label key={record.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.reservationIds.includes(record.id)}
                  onChange={() => handleReservationToggle(record.id)}
                  aria-label={`${record.courseName ?? 'コース未設定'}を精算対象にする`}
                />
                <div className="flex-1 text-sm">
                  <div className="font-medium">
                    <span>
                      {format(new Date(record.startTime), 'M/d(E) HH:mm', { locale: ja })}{' '}
                    </span>
                    <span>{record.courseName ?? 'コース未設定'}</span>
                  </div>
                  <div className="text-gray-500">
                    キャスト売上: ¥{record.staffRevenue.toLocaleString()}
                    {(record.unpaidAmount ?? record.staffRevenue) !== record.staffRevenue
                      ? ` / 未精算残 ¥${(record.unpaidAmount ?? record.staffRevenue).toLocaleString()}`
                      : ''}{' '}
                    / 状態:{' '}
                    {settlementStatusPresentation[record.settlementStatus ?? 'pending'].label}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      ) : (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          入金対象にできる完了済み・未精算の予約はありません。
        </p>
      )}

      {!hasSelectedReservations ? (
        <p className="text-sm text-amber-700">
          完了済み・未精算の対象予約を1件以上選択してください。
        </p>
      ) : null}

      <div>
        <Label htmlFor="notes">備考</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="特記事項があれば入力してください"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="submit"
          disabled={
            !hasSelectedReservations ||
            amount <= 0 ||
            amount > selectedSalesTotal ||
            isSubmitting
          }
        >
          {isSubmitting ? '処理中...' : '精算を確定'}
        </Button>
      </div>
    </form>
  )
}
