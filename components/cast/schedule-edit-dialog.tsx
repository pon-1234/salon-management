"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Edit, Save, X } from "lucide-react"

interface ScheduleData {
  [key: string]: {
    startHour: string
    startMinute: string
    endHour: string
    endMinute: string
    status: string
    workFlag: string
    additionalData: string
    womenRelated: string
    storeRelated: string
    notes: string
  }
}

interface ScheduleEditDialogProps {
  castName: string
  onSave: (schedule: ScheduleData) => void
}

export function ScheduleEditDialog({ castName, onSave }: ScheduleEditDialogProps) {
  const [open, setOpen] = useState(false)
  const [schedule, setSchedule] = useState<ScheduleData>({
    "03(火)": { startHour: "20", startMinute: "00", endHour: "29", endMinute: "00", status: "3", workFlag: "0", additionalData: "0", womenRelated: "", storeRelated: "", notes: "※実出勤（22:00〜5:00）" },
    "04(水)": { startHour: "13", startMinute: "00", endHour: "23", endMinute: "30", status: "3", workFlag: "0", additionalData: "0", womenRelated: "", storeRelated: "", notes: "" },
    "05(木)": { startHour: "15", startMinute: "00", endHour: "29", endMinute: "00", status: "3", workFlag: "0", additionalData: "0", womenRelated: "", storeRelated: "", notes: "" },
    "06(金)": { startHour: "13", startMinute: "00", endHour: "29", endMinute: "00", status: "3", workFlag: "0", additionalData: "0", womenRelated: "", storeRelated: "", notes: "" },
    "07(土)": { startHour: "13", startMinute: "00", endHour: "23", endMinute: "30", status: "3", workFlag: "0", additionalData: "0", womenRelated: "", storeRelated: "", notes: "" },
    "08(日)": { startHour: "none", startMinute: "00", endHour: "none", endMinute: "00", status: "1", workFlag: "0", additionalData: "0", womenRelated: "", storeRelated: "", notes: "" },
    "09(月)": { startHour: "none", startMinute: "00", endHour: "none", endMinute: "00", status: "0", workFlag: "0", additionalData: "0", womenRelated: "", storeRelated: "", notes: "" },
  })

  const handleScheduleChange = (day: string, field: string, value: any) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }))
  }

  const hourOptions = [
    { value: "none", label: "---" },
    ...Array.from({ length: 18 }, (_, i) => ({ value: String(i + 7).padStart(2, '0'), label: String(i + 7).padStart(2, '0') })),
    { value: "25", label: "深1" },
    { value: "26", label: "深2" },
    { value: "27", label: "深3" },
    { value: "28", label: "深4" },
    { value: "29", label: "深5" },
    { value: "30", label: "深6" },
  ]

  const minuteOptions = [
    { value: "00", label: "00" },
    { value: "05", label: "05" },
    { value: "10", label: "10" },
    { value: "15", label: "15" },
    { value: "20", label: "20" },
    { value: "25", label: "25" },
    { value: "30", label: "30" },
    { value: "35", label: "35" },
    { value: "40", label: "40" },
    { value: "45", label: "45" },
    { value: "50", label: "50" },
    { value: "55", label: "55" },
  ]

  const statusOptions = [
    { value: "0", label: "--------", color: "#000000" },
    { value: "1", label: "休日", color: "#FF0000" },
    { value: "2", label: "本日終了", color: "#FF0000" },
    { value: "3", label: "出勤予定", color: "#000000" },
    { value: "4", label: "出勤中", color: "#0000ff" },
    { value: "5", label: "御予約完売", color: "#663399" },
    { value: "6", label: "隠れ出勤", color: "#000000" },
    { value: "9", label: "リクエスト出勤", color: "#000000" },
  ]

  const workFlagOptions = [
    { value: "0", label: "--------" },
    { value: "1", label: "受付" },
    { value: "2", label: "終了" },
  ]

  const additionalDataOptions = [
    { value: "0", label: "--------" },
    { value: "1", label: "当日欠席" },
    { value: "2", label: "ボウズ終了" },
    { value: "3", label: "生休" },
  ]

  const handleSave = () => {
    onSave(schedule)
    setOpen(false)
  }


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="w-4 h-4 mr-2" />
          編集
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{castName} 出勤スケジュール編集</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {Object.entries(schedule).map(([day, data]) => (
            <Card key={day}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{day}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 時間設定 */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={data.startHour} onValueChange={(value) => handleScheduleChange(day, "startHour", value)}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {hourOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span>：</span>
                  <Select value={data.startMinute} onValueChange={(value) => handleScheduleChange(day, "startMinute", value)}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {minuteOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span>〜</span>
                  <Select value={data.endHour} onValueChange={(value) => handleScheduleChange(day, "endHour", value)}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {hourOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span>：</span>
                  <Select value={data.endMinute} onValueChange={(value) => handleScheduleChange(day, "endMinute", value)}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {minuteOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 状態設定 */}
                <div className="flex gap-2 flex-wrap">
                  <Select value={data.status} onValueChange={(value) => handleScheduleChange(day, "status", value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(option => (
                        <SelectItem key={option.value} value={option.value} style={{color: option.color}}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={data.workFlag} onValueChange={(value) => handleScheduleChange(day, "workFlag", value)}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {workFlagOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={data.additionalData} onValueChange={(value) => handleScheduleChange(day, "additionalData", value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {additionalDataOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* テキストフィールド */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium whitespace-nowrap">■女性関連</Label>
                    <Input
                      value={data.womenRelated}
                      onChange={(e) => handleScheduleChange(day, "womenRelated", e.target.value)}
                      className="flex-1"
                      style={{color: "blue"}}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium whitespace-nowrap">■店舗関連</Label>
                    <Input
                      value={data.storeRelated}
                      onChange={(e) => handleScheduleChange(day, "storeRelated", e.target.value)}
                      className="flex-1"
                      style={{color: "blue"}}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium whitespace-nowrap">■備考</Label>
                    <Input
                      value={data.notes}
                      onChange={(e) => handleScheduleChange(day, "notes", e.target.value)}
                      className="flex-1"
                      style={{color: "green"}}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            <X className="w-4 h-4 mr-2" />
            キャンセル
          </Button>
          <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
            <Save className="w-4 h-4 mr-2" />
            保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}