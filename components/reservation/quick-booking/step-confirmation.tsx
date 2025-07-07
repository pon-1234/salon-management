import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check } from 'lucide-react'

interface StepConfirmationProps {
  bookingDetails: any
  totalPrice: number
}

export function StepConfirmation({ bookingDetails, totalPrice }: StepConfirmationProps) {
  return (
    <div className="space-y-6">
      {/* Booking Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center">
            <Check className="mr-2 h-5 w-5" />
            予約内容確認
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div>
                <span className="text-gray-600">お客様:</span>
                <span className="ml-2 font-semibold">{bookingDetails.customerName}</span>
              </div>
              <div>
                <span className="text-gray-600">日時:</span>
                <span className="ml-2 font-semibold">
                  {bookingDetails.date} {bookingDetails.time}
                </span>
              </div>
              <div>
                <span className="text-gray-600">担当:</span>
                <span className="ml-2 font-semibold">{bookingDetails.staff}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-gray-600">コース:</span>
                <span className="ml-2 font-semibold">{bookingDetails.course}</span>
              </div>
              <div>
                <span className="text-gray-600">場所:</span>
                <span className="ml-2 font-semibold">{bookingDetails.specificLocation}</span>
              </div>
              <div>
                <span className="text-gray-600">お支払い:</span>
                <span className="ml-2 font-semibold">{bookingDetails.paymentMethod}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>料金内訳</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>基本料金</span>
              <span>16,000円</span>
            </div>
            <div className="flex justify-between">
              <span>本指名料</span>
              <span>2,000円</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>店舗イベント割引</span>
              <span>-3,000円</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between text-lg font-bold">
              <span>合計</span>
              <span className="font-bold">{totalPrice.toLocaleString()}円</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
