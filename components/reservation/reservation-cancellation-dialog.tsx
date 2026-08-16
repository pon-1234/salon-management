'use client'

/**
 * @design_doc   refactor-instructions.md Phase 5 reservation dialog extraction
 * @related_to   reservation-dialog.tsx: focused cancellation reason confirmation UI
 * @known_issues None
 */
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'

interface ReservationCancellationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  source: 'customer' | 'store'
  onSourceChange: (source: 'customer' | 'store') => void
  reason: string
  onReasonChange: (reason: string) => void
  isSubmitting: boolean
  canConfirm: boolean
  onConfirm: () => void
}

interface DiscardReservationEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDiscard: () => void
}

export function DiscardReservationEditDialog({
  open,
  onOpenChange,
  onDiscard,
}: DiscardReservationEditDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>編集内容を破棄しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            保存していない予約の編集内容があります。閉じると変更は破棄されます。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>戻る</AlertDialogCancel>
          <AlertDialogAction onClick={onDiscard}>破棄する</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function ReservationCancellationDialog({
  open,
  onOpenChange,
  source,
  onSourceChange,
  reason,
  onReasonChange,
  isSubmitting,
  canConfirm,
  onConfirm,
}: ReservationCancellationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>キャンセル理由を選択</AlertDialogTitle>
          <AlertDialogDescription>
            キャンセル区分を選び、現場で確認できる具体的な理由を入力してください。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <RadioGroup
          value={source}
          onValueChange={(value) => onSourceChange(value as 'customer' | 'store')}
          className="space-y-2"
        >
          <div className="flex items-center gap-3 rounded-md border p-3">
            <RadioGroupItem value="customer" id="cancel-reason-customer" />
            <Label htmlFor="cancel-reason-customer" className="space-y-1">
              <div className="font-medium">顧客都合</div>
              <p className="text-xs text-muted-foreground">お客様からのキャンセル連絡</p>
            </Label>
          </div>
          <div className="flex items-center gap-3 rounded-md border p-3">
            <RadioGroupItem value="store" id="cancel-reason-store" />
            <Label htmlFor="cancel-reason-store" className="space-y-1">
              <div className="font-medium">店舗都合</div>
              <p className="text-xs text-muted-foreground">キャスト体調不良・遅延など店舗起因</p>
            </Label>
          </div>
        </RadioGroup>
        <div className="space-y-2">
          <Label htmlFor="cancellation-reason-detail">キャンセル理由詳細</Label>
          <Textarea
            id="cancellation-reason-detail"
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            maxLength={500}
            placeholder="例：お客様の予定変更、キャスト体調不良"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>戻る</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isSubmitting || !canConfirm}>
            {isSubmitting ? '処理中…' : '確定してキャンセル'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
