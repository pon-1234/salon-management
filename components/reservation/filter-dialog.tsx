/**
 * @design_doc   docs/PREVIEW_UAT_CHECKLIST.md reservation timeline operational filters
 * @related_to   ReservationPageContent and TimelineFilterOptions
 * @known_issues None
 */
'use client'

import { useEffect, useState } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import {
  DEFAULT_TIMELINE_FILTERS,
  type TimelineFilterOptions,
} from '@/lib/reservation/timeline-filters'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface FilterOption {
  id: string
  name: string
}

interface FilterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApplyFilters: (filters: TimelineFilterOptions) => void
  filters: TimelineFilterOptions
  selectedDate: Date
  options: FilterOption[]
}

const AVAILABILITY_FILTERS: Array<{
  value: TimelineFilterOptions['availability']
  label: string
}> = [
  { value: 'all', label: 'すべて' },
  { value: 'open', label: '空きあり' },
  { value: 'booked', label: '予約あり' },
]

export function FilterDialog({
  open,
  onOpenChange,
  onApplyFilters,
  filters,
  selectedDate,
  options,
}: FilterDialogProps) {
  const [draft, setDraft] = useState<TimelineFilterOptions>(filters)

  useEffect(() => {
    if (open) {
      setDraft(filters)
    }
  }, [filters, open])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onApplyFilters(draft)
    onOpenChange(false)
  }

  const selectedDateLabel = formatInTimeZone(selectedDate, 'Asia/Tokyo', 'yyyy年MM月dd日')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">絞り込み</DialogTitle>
          <DialogDescription className="text-center">
            予約受付に必要な空き状況・オプション・キャスト名で絞り込みます。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset className="space-y-3">
            <legend className="text-lg font-medium">{selectedDateLabel}の空き状況</legend>
            <div className="flex flex-wrap gap-2">
              {AVAILABILITY_FILTERS.map(({ value, label }) => (
                <Button
                  key={value}
                  type="button"
                  onClick={() => setDraft((current) => ({ ...current, availability: value }))}
                  variant={draft.availability === value ? 'default' : 'outline'}
                  className={draft.availability === value ? 'bg-emerald-600' : ''}
                >
                  {label}
                </Button>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-lg font-medium">対応オプション</legend>
            {options.length === 0 ? (
              <p className="text-sm text-muted-foreground">登録済みオプションがありません。</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => setDraft((current) => ({ ...current, optionId: '' }))}
                  variant={draft.optionId === '' ? 'default' : 'outline'}
                  className={draft.optionId === '' ? 'bg-emerald-600' : ''}
                >
                  すべて
                </Button>
                {options.map((option) => (
                  <Button
                    key={option.id}
                    type="button"
                    onClick={() => setDraft((current) => ({ ...current, optionId: option.id }))}
                    variant={draft.optionId === option.id ? 'default' : 'outline'}
                    className={draft.optionId === option.id ? 'bg-emerald-600' : ''}
                  >
                    {option.name}
                  </Button>
                ))}
              </div>
            )}
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="timeline-cast-name">キャスト名</Label>
            <Input
              id="timeline-cast-name"
              value={draft.name}
              onChange={(event) =>
                setDraft((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="名前・ふりがな"
            />
          </div>

          <div className="flex flex-wrap justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDraft(DEFAULT_TIMELINE_FILTERS)}
            >
              条件をクリア
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                キャンセル
              </Button>
              <Button type="submit" className="bg-emerald-600">
                適用
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export type FilterOptions = TimelineFilterOptions
