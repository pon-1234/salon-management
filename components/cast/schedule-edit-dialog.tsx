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
import { Switch } from "@/components/ui/switch"
import { Edit, Save, X } from "lucide-react"

interface ScheduleData {
  [key: string]: {
    isWorking: boolean
    startTime: string
    endTime: string
    status: "confirmed" | "tentative" | "off"
  }
}

interface ScheduleEditDialogProps {
  castName: string
  onSave: (schedule: ScheduleData) => void
}

export function ScheduleEditDialog({ castName, onSave }: ScheduleEditDialogProps) {
  const [open, setOpen] = useState(false)
  const [schedule, setSchedule] = useState<ScheduleData>({
    "03(火)": { isWorking: true, startTime: "20:00", endTime: "29:00", status: "confirmed" },
    "04(水)": { isWorking: true, startTime: "13:00", endTime: "23:30", status: "confirmed" },
    "05(木)": { isWorking: true, startTime: "15:00", endTime: "29:00", status: "confirmed" },
    "06(金)": { isWorking: true, startTime: "13:00", endTime: "29:00", status: "confirmed" },
    "07(土)": { isWorking: true, startTime: "13:00", endTime: "23:30", status: "confirmed" },
    "08(日)": { isWorking: false, startTime: "", endTime: "", status: "off" },
    "09(月)": { isWorking: true, startTime: "", endTime: "", status: "tentative" },
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

  const handleWorkingToggle = (day: string, isWorking: boolean) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        isWorking,
        status: isWorking ? "confirmed" : "off",
        startTime: isWorking ? prev[day].startTime : "",
        endTime: isWorking ? prev[day].endTime : ""
      }
    }))
  }

  const handleSave = () => {
    onSave(schedule)
    setOpen(false)
  }

  const getStatusText = (status: string, isWorking: boolean) => {
    if (!isWorking) return "休日"
    if (status === "tentative") return "未定"
    return "出勤"
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
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{day}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`working-${day}`} className="text-sm">
                      出勤
                    </Label>
                    <Switch
                      id={`working-${day}`}
                      checked={data.isWorking}
                      onCheckedChange={(checked) => handleWorkingToggle(day, checked)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {data.isWorking ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`start-${day}`}>開始時間</Label>
                      <Input
                        id={`start-${day}`}
                        type="time"
                        value={data.startTime}
                        onChange={(e) => handleScheduleChange(day, "startTime", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`end-${day}`}>終了時間</Label>
                      <Input
                        id={`end-${day}`}
                        type="time"
                        value={data.endTime}
                        onChange={(e) => handleScheduleChange(day, "endTime", e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 text-center py-4">
                    休日
                  </div>
                )}
                
                {data.isWorking && (
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant={data.status === "confirmed" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleScheduleChange(day, "status", "confirmed")}
                    >
                      確定
                    </Button>
                    <Button
                      variant={data.status === "tentative" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleScheduleChange(day, "status", "tentative")}
                    >
                      未定
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base">実出勤時間</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="actual-start">開始時間</Label>
                  <Input
                    id="actual-start"
                    type="time"
                    defaultValue="22:00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="actual-end">終了時間</Label>
                  <Input
                    id="actual-end"
                    type="time"
                    defaultValue="05:00"
                  />
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                ※実際の出勤時間を設定してください
              </p>
            </CardContent>
          </Card>
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