"use client"

import { useState } from "react"
import { Cast } from "@/lib/cast/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { 
  Clock, 
  CalendarDays, 
  User, 
  Phone, 
  Mail, 
  Settings,
  Edit,
  Plus,
  DollarSign
} from 'lucide-react'
import { ScheduleEditDialog } from "@/components/cast/schedule-edit-dialog"

interface CastDashboardProps {
  cast: Cast
  onUpdate: (data: Partial<Cast>) => void
}

export function CastDashboard({ cast, onUpdate }: CastDashboardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: cast.name,
    nameKana: cast.nameKana,
    phone: "",
    email: "",
    type: cast.type,
    netReservation: cast.netReservation,
    specialDesignationFee: cast.specialDesignationFee,
    regularDesignationFee: cast.regularDesignationFee,
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = () => {
    onUpdate(formData)
    setIsEditing(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
      {/* 左側: 基本情報 (2/5) */}
      <div className="lg:col-span-2 space-y-4">
        {/* キャスト基本情報 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="w-5 h-5" />
                基本情報
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm">源氏名</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nameKana" className="text-sm">本名</Label>
                  <Input
                    id="nameKana"
                    name="nameKana"
                    value={formData.nameKana}
                    onChange={handleInputChange}
                    className="h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm">TEL</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm">メール</Label>
                  <Input
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="h-8"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={handleSave}>保存</Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>キャンセル</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">源氏名</span>
                  <span className="font-medium">{cast.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">本名</span>
                  <span>{cast.nameKana}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">タイプ</span>
                  <Badge variant="outline" className="text-xs">{cast.type}</Badge>
                </div>
                <Separator className="my-2" />
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-3 h-3" />
                  <span className="text-xs">090-1234-5678</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-3 h-3" />
                  <span className="text-xs">cast@example.com</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 指名設定 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="w-5 h-5" />
              指名設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="netReservation" className="text-sm">ネット予約</Label>
              <Switch
                id="netReservation"
                checked={cast.netReservation}
                onCheckedChange={(checked) => onUpdate({ netReservation: checked })}
              />
            </div>
            <Separator />
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">特別指名料</span>
                <span className="font-medium">{cast.specialDesignationFee ? `${cast.specialDesignationFee}円` : "未設定"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">本指名料</span>
                <span className="font-medium">{cast.regularDesignationFee ? `${cast.regularDesignationFee}円` : "未設定"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">パネル指名ランク</span>
                <Badge variant="secondary" className="text-xs">{cast.panelDesignationRank || 0}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">本指名ランク</span>
                <Badge variant="secondary" className="text-xs">{cast.regularDesignationRank || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 右側: スケジュール・予約情報 (3/5) */}
      <div className="lg:col-span-3 space-y-4">
        {/* 今週のスケジュール */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                今週のスケジュール
              </CardTitle>
              <ScheduleEditDialog 
                castName={cast.name}
                onSave={(schedule) => {
                  console.log("スケジュール更新:", schedule)
                }}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {[
                { day: "月", date: "3", time: "休日", isHoliday: true },
                { day: "火", date: "4", time: "20:00-29:00", isToday: true },
                { day: "水", date: "5", time: "13:00-23:30" },
                { day: "木", date: "6", time: "15:00-29:00" },
                { day: "金", date: "7", time: "13:00-29:00" },
                { day: "土", date: "8", time: "13:00-23:30" },
                { day: "日", date: "9", time: "未定", isUndefined: true }
              ].map((item, index) => (
                <div 
                  key={index}
                  className={`p-1 sm:p-2 rounded-lg text-center text-xs border ${
                    item.isToday 
                      ? "bg-emerald-50 border-emerald-200" 
                      : item.isHoliday
                      ? "bg-gray-50 border-gray-200"
                      : item.isUndefined
                      ? "bg-orange-50 border-orange-200"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <div className="font-medium">{item.day}</div>
                  <div className="text-gray-500 text-xs">{item.date}</div>
                  <div className={`mt-1 text-xs sm:text-xs ${
                    item.isHoliday ? "text-gray-500" : 
                    item.isUndefined ? "text-orange-600" : "text-gray-800"
                  }`}>
                    <span className="hidden sm:inline">{item.time}</span>
                    <span className="sm:hidden">{item.time.split('-')[0] || item.time}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-gray-600">
              ※実出勤（22:00〜5:00）
            </div>
          </CardContent>
        </Card>

        {/* 予約状況 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />
                予約状況
              </CardTitle>
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                新規予約
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* 今日の予約 */}
              <div className="border rounded-lg p-3 bg-emerald-50 border-emerald-200">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-emerald-600">今日</Badge>
                  <span className="font-medium">タナカ 様</span>
                  <Badge variant="outline" className="text-xs">おすすめ指名</Badge>
                </div>
                <div className="text-sm text-gray-700 space-y-1">
                  <div className="font-medium">17:30 - 19:20</div>
                  <div>イベント110分</div>
                  <div className="font-semibold text-emerald-700">15,000円</div>
                </div>
                <div className="flex gap-1 mt-2">
                  <Badge variant="destructive" className="text-xs">メール未送信</Badge>
                  <Badge variant="destructive" className="text-xs">女性未確認</Badge>
                </div>
              </div>

              {/* 明日の予約 */}
              <div className="border rounded-lg p-3 bg-blue-50 border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">明日</Badge>
                  <span className="font-medium">サトウ 様</span>
                  <Badge variant="outline" className="text-xs">本指名</Badge>
                </div>
                <div className="text-sm text-gray-700 space-y-1">
                  <div className="font-medium">20:00 - 22:00</div>
                  <div>基本120分</div>
                  <div className="font-semibold text-blue-700">18,000円</div>
                </div>
                <div className="flex gap-1 mt-2">
                  <Badge variant="secondary" className="text-xs">確認済み</Badge>
                </div>
              </div>

              {/* 週末の予約 */}
              <div className="border rounded-lg p-3 bg-gray-50 border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">土曜日</Badge>
                  <span className="font-medium">ヤマダ 様</span>
                  <Badge variant="outline" className="text-xs">新規</Badge>
                </div>
                <div className="text-sm text-gray-700 space-y-1">
                  <div className="font-medium">15:30 - 17:00</div>
                  <div>基本90分</div>
                  <div className="font-semibold">12,000円</div>
                </div>
                <div className="flex gap-1 mt-2">
                  <Badge className="bg-orange-500 text-xs">要確認</Badge>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t">
              <Button variant="ghost" className="w-full text-sm">
                すべての予約を表示
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}