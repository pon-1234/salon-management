'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Cast, CastSchedule } from '@/lib/cast/types'
import { FALLBACK_IMAGE } from '@/lib/cast/mapper'
import { options } from '@/lib/course-option/data'
import { Button } from '@/components/ui/button'
import { generateCastSchedule } from '@/lib/cast/data'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface CastDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  staff: Cast | null
  selectedDate: Date
}

export function StaffDialog({ open, onOpenChange, staff, selectedDate }: CastDialogProps) {
  const [schedule, setSchedule] = useState<CastSchedule[]>([])

  useEffect(() => {
    if (staff) {
      const endDate = new Date(selectedDate)
      endDate.setDate(selectedDate.getDate() + 7)
      const generatedSchedule = generateCastSchedule(staff.id, selectedDate, endDate)
      setSchedule(generatedSchedule)
    }
  }, [staff, selectedDate])

  if (!staff) return null
  const staffImage = staff.image?.trim() ? staff.image : FALLBACK_IMAGE

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto p-0">
        <DialogTitle>
          <span className="sr-only">{staff.name}のプロフィールと予約状況</span>
        </DialogTitle>
        <div className="p-6">
          <div className="flex gap-6">
            {/* 左側：画像とスタッフ詳細情報 */}
            <div className="w-1/2 space-y-6">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={staffImage}
                  alt={`${staff.name}の写真`}
                  className="aspect-[7/10] w-full rounded-lg object-cover"
                />
                <Badge className="absolute left-4 top-4 bg-emerald-600">掲載中</Badge>
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-bold">{staff.name}</h2>
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
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <div>ネット予約</div>
                  <div className="text-emerald-600">{staff.netReservation ? '可' : '不可'}</div>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <div>特別指名料</div>
                  <div>
                    {staff.specialDesignationFee
                      ? `${staff.specialDesignationFee.toLocaleString()}円`
                      : '-'}
                  </div>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <div>本指名</div>
                  <div>
                    {staff.regularDesignationFee
                      ? `${staff.regularDesignationFee.toLocaleString()}円`
                      : '-'}
                  </div>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <div>パネル指名ランク</div>
                  <div>{staff.panelDesignationRank}</div>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <div>本指名ランク</div>
                  <div>{staff.regularDesignationRank}</div>
                </div>
              </div>
            </div>

            {/* 右側：出勤情報と利用可能なオプション */}
            <div className="w-1/2 space-y-6">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">出勤情報</h2>
                <div className="max-h-[300px] space-y-2 overflow-y-auto">
                  {schedule.map((day, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="space-y-1">
                        <div className="font-medium">
                          {format(day.date, 'yyyy/MM/dd (E)', { locale: ja })}
                        </div>
                        <div className="text-sm text-gray-600">
                          {format(day.startTime, 'HH:mm', { locale: ja })} -
                          {format(day.endTime, 'HH:mm', { locale: ja })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {day.bookings && (
                          <Badge className="bg-emerald-100 text-emerald-700">
                            予約 {day.bookings}件
                          </Badge>
                        )}
                        <Button variant="default" size="sm" className="bg-emerald-600">
                          選択
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="flex items-center gap-2 font-bold">
                  利用可能なオプション
                  <Badge variant="secondary" className="bg-emerald-100">
                    {options.length}点
                  </Badge>
                </h4>
                <div className="grid max-h-[200px] grid-cols-2 gap-2 overflow-y-auto">
                  {options.map((option, index) => (
                    <div key={index} className="relative rounded-lg border p-3 text-sm">
                      <div className="font-medium">{option.name}</div>
                      <div className="text-emerald-600">¥{option.price.toLocaleString()}</div>
                      {option.note && (
                        <div className="absolute right-2 top-2 text-xs text-gray-500">
                          {option.note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
