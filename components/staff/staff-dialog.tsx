"use client"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Staff, StaffSchedule } from "@/lib/staff/types"
import { options } from "@/lib/course-option/data"
import { Button } from "@/components/ui/button"
import { generateStaffSchedule } from "@/lib/staff/data"
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useState, useEffect } from "react"

interface StaffDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  staff: Staff | null
  selectedDate: Date
}

export function StaffDialog({ open, onOpenChange, staff, selectedDate }: StaffDialogProps) {
  const [schedule, setSchedule] = useState<StaffSchedule[]>([])

  useEffect(() => {
    if (staff) {
      const endDate = new Date(selectedDate)
      endDate.setDate(selectedDate.getDate() + 7)
      const generatedSchedule = generateStaffSchedule(staff.id, selectedDate, endDate)
      setSchedule(generatedSchedule)
    }
  }, [staff, selectedDate])

  if (!staff) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 overflow-y-auto max-h-[90vh]">
        <DialogTitle>
          <span className="sr-only">{staff.name}のプロフィールと予約状況</span>
        </DialogTitle>
        <div className="p-6">
          <div className="flex gap-6">
            {/* 左側：画像とスタッフ詳細情報 */}
            <div className="w-1/2 space-y-6">
              <div className="relative">
                <img
                  src={staff.image}
                  alt={`${staff.name}の写真`}
                  className="w-full h-[300px] object-cover rounded-lg"
                />
                <Badge className="absolute top-4 left-4 bg-emerald-600">掲載中</Badge>
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
                    <dd>{staff.bust}/{staff.waist}/{staff.hip} ({staff.bust}カップ)</dd>
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
                <div className="flex justify-between items-center border-b pb-2">
                  <div>ネット予約</div>
                  <div className="text-emerald-600">{staff.netReservation ? "可" : "不可"}</div>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <div>特別指名料</div>
                  <div>{staff.specialDesignationFee ? `${staff.specialDesignationFee.toLocaleString()}円` : "-"}</div>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <div>本指名</div>
                  <div>{staff.regularDesignationFee ? `${staff.regularDesignationFee.toLocaleString()}円` : "-"}</div>
                </div>
              </div>
            </div>

            {/* 右側：出勤情報と利用可能なオプション */}
            <div className="w-1/2 space-y-6">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">出勤情報</h2>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {schedule.map((day, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
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
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-emerald-600"
                        >
                          選択
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold flex items-center gap-2">
                  利用可能なオプション
                  <Badge variant="secondary" className="bg-emerald-100">{options.length}点</Badge>
                </h4>
                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                  {options.map((option, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-3 text-sm relative"
                    >
                      <div className="font-medium">{option.name}</div>
                      <div className="text-emerald-600">
                        ¥{option.price.toLocaleString()}
                      </div>
                      {option.note && (
                        <div className="absolute top-2 right-2 text-gray-500 text-xs">
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
