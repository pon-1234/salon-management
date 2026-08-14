/**
 * @design_doc   docs/PREVIEW_UAT_CHECKLIST.md timeline cast detail contract
 * @related_to   Timeline and Cast schedule/option data
 * @known_issues None
 */
'use client'

import React from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import { ja } from 'date-fns/locale'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Cast } from '@/lib/cast/types'
import { FALLBACK_IMAGE } from '@/lib/cast/mapper'
import { SafeImage } from '@/components/ui/safe-image'

const JST_TIMEZONE = 'Asia/Tokyo'

export interface StaffOptionCatalogEntry {
  id: string
  name: string
  price: number
  note?: string | null
}

interface CastDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  staff: Cast | null
  selectedDate: Date
  optionCatalog?: StaffOptionCatalogEntry[]
}

export function StaffDialog({
  open,
  onOpenChange,
  staff,
  selectedDate,
  optionCatalog = [],
}: CastDialogProps) {
  if (!staff) return null

  const staffImage = staff.image?.trim() ? staff.image : FALLBACK_IMAGE
  const assignedOptions = optionCatalog.filter((option) =>
    staff.availableOptions.includes(option.id)
  )
  const selectedDateLabel = formatInTimeZone(selectedDate, JST_TIMEZONE, 'yyyy/MM/dd (E)', {
    locale: ja,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto p-0">
        <DialogTitle>
          <span className="sr-only">{staff.name}のプロフィールと出勤情報</span>
        </DialogTitle>
        <DialogDescription className="sr-only">
          実際のプロフィール、選択日の出勤、対応オプションを表示します。
        </DialogDescription>
        <div className="grid gap-6 p-6 md:grid-cols-2">
          <div className="space-y-6">
            <div className="relative">
              <SafeImage
                src={staffImage}
                alt={`${staff.name}の写真`}
                className="aspect-[7/10] w-full rounded-lg object-cover"
              />
              <Badge className="absolute left-4 top-4 bg-emerald-600">掲載中</Badge>
            </div>

            <section className="space-y-4" aria-labelledby="staff-profile-heading">
              <h2 id="staff-profile-heading" className="text-3xl font-bold">
                {staff.name}
              </h2>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-gray-600">年齢：</dt>
                  <dd>{staff.age}歳</dd>
                </div>
                <div>
                  <dt className="text-gray-600">スリーサイズ：</dt>
                  <dd>
                    {staff.bust}/{staff.waist}/{staff.hip} ({staff.bust}カップ)
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-600">身長：</dt>
                  <dd>{staff.height}cm</dd>
                </div>
                <div>
                  <dt className="text-gray-600">タイプ：</dt>
                  <dd>{staff.type}</dd>
                </div>
              </dl>
            </section>

            <section className="space-y-2" aria-labelledby="staff-description-heading">
              <h3 id="staff-description-heading" className="font-bold">
                説明文
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                {staff.description || '説明文は未登録です。'}
              </p>
            </section>

            <dl className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <dt>ネット予約</dt>
                <dd className="text-emerald-600">{staff.netReservation ? '可' : '不可'}</dd>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <dt>特別指名料</dt>
                <dd>
                  {staff.specialDesignationFee
                    ? `${staff.specialDesignationFee.toLocaleString()}円`
                    : '-'}
                </dd>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <dt>本指名</dt>
                <dd>
                  {staff.regularDesignationFee
                    ? `${staff.regularDesignationFee.toLocaleString()}円`
                    : '-'}
                </dd>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <dt>パネル指名ランク</dt>
                <dd>{staff.panelDesignationRank || '-'}</dd>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <dt>本指名ランク</dt>
                <dd>{staff.regularDesignationRank || '-'}</dd>
              </div>
            </dl>
          </div>

          <div className="space-y-6">
            <section className="space-y-4" aria-labelledby="staff-schedule-heading">
              <h2 id="staff-schedule-heading" className="text-2xl font-bold">
                出勤情報
              </h2>
              <div className="rounded-lg border p-4">
                <div className="font-medium">{selectedDateLabel}</div>
                {staff.workStart && staff.workEnd ? (
                  <div className="mt-1 text-sm text-gray-600">
                    {formatInTimeZone(staff.workStart, JST_TIMEZONE, 'HH:mm')} -{' '}
                    {formatInTimeZone(staff.workEnd, JST_TIMEZONE, 'HH:mm')}
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-gray-600">この日の出勤登録はありません。</p>
                )}
              </div>
            </section>

            <section className="space-y-4" aria-labelledby="staff-options-heading">
              <h3 id="staff-options-heading" className="flex items-center gap-2 font-bold">
                対応オプション
                <Badge variant="secondary" className="bg-emerald-100">
                  {assignedOptions.length}点
                </Badge>
              </h3>
              {assignedOptions.length > 0 ? (
                <div className="grid max-h-[320px] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                  {assignedOptions.map((option) => (
                    <div key={option.id} className="rounded-lg border p-3 text-sm">
                      <div className="font-medium">{option.name}</div>
                      <div className="text-emerald-600">¥{option.price.toLocaleString()}</div>
                      {option.note ? (
                        <div className="mt-1 text-xs text-gray-500">{option.note}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed p-4 text-sm text-gray-600">
                  対応オプションは登録されていません。
                </p>
              )}
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
