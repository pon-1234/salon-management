"use client"

import { useState, useEffect } from "react"
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
import { ReservationDialog } from "@/components/reservation/reservation-dialog"
import { ReservationData, Reservation } from "@/lib/types/reservation"
import { getAllReservations } from "@/lib/reservation/data"
import { format } from "date-fns"

interface CastDashboardProps {
  cast: Cast
  onUpdate: (data: Partial<Cast>) => void
}

export function CastDashboard({ cast, onUpdate }: CastDashboardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
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

  // 予約データを取得
  useEffect(() => {
    const fetchReservations = async () => {
      const allReservations = await getAllReservations()
      const castReservations = allReservations.filter(r => r.staffId === cast.id)
      setReservations(castReservations)
    }
    fetchReservations()
  }, [cast.id])

  // 予約データをダイアログ用に変換
  const convertToReservationData = (reservation: Reservation): ReservationData | null => {
    if (!reservation) return null;
    
    return {
      id: reservation.id,
      customerId: reservation.customerId,
      customerName: `顧客${reservation.customerId}`,
      customerType: "通常顧客",
      phoneNumber: "090-1234-5678",
      points: 100,
      bookingStatus: reservation.status,
      staffConfirmation: "確認済み",
      customerConfirmation: "確認済み", 
      prefecture: "東京都",
      district: "渋谷区",
      location: "アパホテル",
      locationType: "ホテル",
      specificLocation: "502号室",
      staff: cast.name,
      marketingChannel: "WEB",
      date: format(reservation.startTime, 'yyyy-MM-dd'),
      time: format(reservation.startTime, 'HH:mm'),
      inOutTime: `${format(reservation.startTime, 'HH:mm')}-${format(reservation.endTime, 'HH:mm')}`,
      course: `サービス${reservation.serviceId}`,
      freeExtension: "なし",
      designation: "指名",
      designationFee: "3,000円",
      options: {},
      transportationFee: 0,
      paymentMethod: "現金",
      discount: "0円",
      additionalFee: 0,
      totalPayment: reservation.price,
      storeRevenue: Math.floor(reservation.price * 0.6),
      staffRevenue: Math.floor(reservation.price * 0.4),
      staffBonusFee: 0,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      staffImage: "/placeholder-user.jpg"
    };
  };

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
              {reservations.length > 0 ? (
                reservations
                  .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
                  .slice(0, 3)
                  .map((reservation) => {
                    const today = new Date()
                    const tomorrow = new Date(today)
                    tomorrow.setDate(tomorrow.getDate() + 1)
                    
                    const isToday = reservation.startTime.toDateString() === today.toDateString()
                    const isTomorrow = reservation.startTime.toDateString() === tomorrow.toDateString()
                    
                    return (
                      <div 
                        key={reservation.id}
                        className={`border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${
                          isToday 
                            ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100' 
                            : isTomorrow
                            ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                        onClick={() => setSelectedReservation(reservation)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={isToday ? "bg-emerald-600" : isTomorrow ? "bg-blue-600" : ""} variant={!isToday && !isTomorrow ? "outline" : "default"}>
                            {isToday ? "今日" : isTomorrow ? "明日" : format(reservation.startTime, 'M/d')}
                          </Badge>
                          <span className="font-medium">顧客{reservation.customerId}</span>
                          <Badge variant="outline" className="text-xs">
                            {reservation.status === 'confirmed' ? '確定' : 
                             reservation.status === 'pending' ? '仮予約' : '修正可能'}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-700 space-y-1">
                          <div className="font-medium">
                            {format(reservation.startTime, 'HH:mm')} - {format(reservation.endTime, 'HH:mm')}
                          </div>
                          <div>サービス{reservation.serviceId}</div>
                          <div className={`font-semibold ${isToday ? 'text-emerald-700' : isTomorrow ? 'text-blue-700' : ''}`}>
                            {reservation.price.toLocaleString()}円
                          </div>
                        </div>
                        <div className="flex gap-1 mt-2">
                          <Badge variant={reservation.status === 'confirmed' ? "secondary" : "destructive"} className="text-xs">
                            {reservation.status === 'confirmed' ? '確認済み' : '要確認'}
                          </Badge>
                        </div>
                      </div>
                    )
                  })
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CalendarDays className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium mb-2">予約はありません</p>
                  <p className="text-sm">現在、予約はありません</p>
                </div>
              )}
            </div>
            
            <div className="mt-4 pt-3 border-t">
              <Button variant="ghost" className="w-full text-sm">
                すべての予約を表示
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 予約詳細ダイアログ */}
      <ReservationDialog
        open={!!selectedReservation}
        onOpenChange={(open) => !open && setSelectedReservation(null)}
        reservation={selectedReservation ? convertToReservationData(selectedReservation) : null}
      />
    </div>
  )
}