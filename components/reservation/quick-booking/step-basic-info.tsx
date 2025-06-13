import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock } from 'lucide-react'
import { CustomerInfoCard } from './customer-info-card'

interface BookingDetails {
  customerName: string
  customerType: string
  phoneNumber: string
  points: number
  bookingStatus: string
  date: string
  time: string
  staff: string
  course: string
}

interface StepBasicInfoProps {
  bookingDetails: BookingDetails
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
}

export function StepBasicInfo({ bookingDetails, onInputChange }: StepBasicInfoProps) {
  return (
    <div className="space-y-6">
      <CustomerInfoCard
        customerName={bookingDetails.customerName}
        customerType={bookingDetails.customerType}
        phoneNumber={bookingDetails.phoneNumber}
        points={bookingDetails.points}
      />

      {/* Service Selection Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            サービス詳細
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>日付</Label>
              <Input 
                type="date" 
                value={bookingDetails.date} 
                readOnly 
                className="bg-gray-50"
              />
            </div>
            <div>
              <Label>時間</Label>
              <Input 
                type="time" 
                value={bookingDetails.time} 
                readOnly 
                className="bg-gray-50"
              />
            </div>
          </div>
          
          <div>
            <Label>担当キャスト</Label>
            <Input 
              value={bookingDetails.staff} 
              readOnly 
              className="bg-gray-50"
            />
          </div>

          <div>
            <Label>コース選択</Label>
            <Select 
              value={bookingDetails.course} 
              onValueChange={(value) => onInputChange({ target: { name: "course", value } } as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="イベント70分 16,000円">イベント70分 16,000円</SelectItem>
                <SelectItem value="スタンダード60分 14,000円">スタンダード60分 14,000円</SelectItem>
                <SelectItem value="ロング90分 20,000円">ロング90分 20,000円</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Booking Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            予約ステータス
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">予約レベル</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {["仮予約", "ネット予約", "事前予約", "当日予約", "確定済"].map((status) => (
                  <Button
                    key={status}
                    type="button"
                    size="sm"
                    onClick={() => onInputChange({ target: { name: "bookingStatus", value: status } } as any)}
                    variant={bookingDetails.bookingStatus === status ? "default" : "outline"}
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}