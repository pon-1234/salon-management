"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { ja } from 'date-fns/locale'
import { Phone, Clock, User, MapPin, CreditCard, ChevronRight, ChevronLeft, Check, Calendar, Users } from 'lucide-react'
import { Customer } from "@/lib/customer/types"
import { Cast } from "@/lib/cast/types"
import { options } from "@/lib/course-option/data"

interface QuickBookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedStaff?: Cast
  selectedTime?: Date
  selectedCustomer: Customer | null
}

export function QuickBookingDialog({
  open,
  onOpenChange,
  selectedStaff,
  selectedTime,
  selectedCustomer
}: QuickBookingDialogProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 3

  // Get available options for the selected staff
  const availableOptions = selectedStaff?.availableOptions 
    ? options.filter(option => selectedStaff.availableOptions.includes(option.id))
    : options
  const [bookingDetails, setBookingDetails] = useState({
    customerName: selectedCustomer?.name || "",  // 更新
    customerType: selectedCustomer?.memberType === 'vip' ? "VIPメンバー" : "通常会員",  // 更新
    phoneNumber: selectedCustomer?.phone || "",  // 更新
    points: selectedCustomer?.points || 0,  // 更新
    bookingStatus: "仮予約",
    staffConfirmation: "未確認",
    customerConfirmation: "未確認",
    prefecture: "東京都",
    district: "豊島区",
    location: "池袋（北口・西口）(0円)",
    locationType: "ホテル利用",
    specificLocation: "グランドホテル 605",
    staff: selectedStaff?.name || "", // Remove default "やぎ"
    marketingChannel: "店リピート",
    date: selectedTime ? format(selectedTime, 'yyyy-MM-dd') : "",
    time: selectedTime ? format(selectedTime, 'HH:mm') : "",
    inOutTime: "",
    course: "イベント70分 16,000円",
    freeExtension: "0",
    designation: "本指名 (2,000円)",
    designationFee: "0円",
    options: {
      "回春増し増し": true,
    },
    transportationFee: 0,
    paymentMethod: "現金",
    discount: "お店イベント 3,000円",
    additionalFee: 0,
    totalPayment: 17000,
    storeRevenue: 5000,
    staffRevenue: 12000,
    staffBonusFee: 0,
  })

  const [totalPrice, setTotalPrice] = useState(17000)

  useEffect(() => {
    calculateTotalPrice()
  }, [bookingDetails])

  useEffect(() => {
    if (selectedTime) {
      setBookingDetails(prev => ({
        ...prev,
        date: format(selectedTime, 'yyyy-MM-dd'),
        time: format(selectedTime, 'HH:mm'),
      }))
    }
    if (selectedStaff) {
      setBookingDetails(prev => ({
        ...prev,
        staff: selectedStaff.name,
      }))
    }
  }, [selectedTime, selectedStaff])

  useEffect(() => {
    if (selectedCustomer) {
      setBookingDetails(prev => ({
        ...prev,
        customerName: selectedCustomer.name,
        customerType: selectedCustomer.memberType === 'vip' ? "VIPメンバー" : "通常会員",
        phoneNumber: selectedCustomer.phone,
        points: selectedCustomer.points,
      }))
    }
  }, [selectedCustomer])

  const calculateTotalPrice = () => {
    // Implement the price calculation logic here
    // This is a placeholder calculation
    let total = 16000 // Base course price
    total += 2000 // Designation fee
    total -= 3000 // Store event discount
    setTotalPrice(total)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setBookingDetails(prev => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setBookingDetails(prev => ({
      ...prev,
      options: { ...prev.options, [name]: checked }
    }))
  }

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = () => {
    // Handle form submission
    console.log('Booking submitted:', bookingDetails)
    onOpenChange(false)
  }

  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              step === currentStep
                ? 'bg-emerald-600 text-white'
                : step < currentStep
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-gray-200 text-gray-500'
            }`}
          >
            {step < currentStep ? <Check className="w-4 h-4" /> : step}
          </div>
          {step < 3 && (
            <div
              className={`w-12 h-1 mx-2 ${
                step < currentStep ? 'bg-emerald-600' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )

  const stepTitles = [
    '基本情報',
    '詳細設定',
    '確認・完了'
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-white border border-gray-200">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-emerald-600">簡単受付</DialogTitle>
          <StepIndicator />
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800">{stepTitles[currentStep - 1]}</h3>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-2">
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Customer Information Card */}
              <Card className="border-emerald-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-emerald-700">
                    <User className="mr-2 h-5 w-5" />
                    お客様情報
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-emerald-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold text-emerald-700">{bookingDetails.customerName}</h3>
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 mt-1">
                          {bookingDetails.customerType}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center text-emerald-600">
                          <Phone className="h-4 w-4 mr-1" />
                          <span className="font-semibold">{bookingDetails.phoneNumber}</span>
                        </div>
                        <div className="text-sm text-emerald-600 mt-1">
                          現在 {bookingDetails.points}pt
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Service Selection Card */}
              <Card className="border-emerald-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-emerald-700">
                    <Calendar className="mr-2 h-5 w-5" />
                    サービス詳細
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-emerald-700">日付</Label>
                      <Input 
                        type="date" 
                        value={bookingDetails.date} 
                        readOnly 
                        className="bg-emerald-50 border-emerald-200"
                      />
                    </div>
                    <div>
                      <Label className="text-emerald-700">時間</Label>
                      <Input 
                        type="time" 
                        value={bookingDetails.time} 
                        readOnly 
                        className="bg-emerald-50 border-emerald-200"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-emerald-700">担当キャスト</Label>
                    <Input 
                      value={bookingDetails.staff} 
                      readOnly 
                      className="bg-emerald-50 border-emerald-200"
                    />
                  </div>

                  <div>
                    <Label className="text-emerald-700">コース選択</Label>
                    <Select 
                      value={bookingDetails.course} 
                      onValueChange={(value) => handleInputChange({ target: { name: "course", value } } as any)}
                    >
                      <SelectTrigger className="border-emerald-200">
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
              <Card className="border-emerald-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-emerald-700">
                    <Clock className="mr-2 h-5 w-5" />
                    予約ステータス
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-emerald-700 text-sm">予約レベル</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {["仮予約", "ネット予約", "事前予約", "当日予約", "確定済"].map((status) => (
                          <Button
                            key={status}
                            type="button"
                            size="sm"
                            onClick={() => handleInputChange({ target: { name: "bookingStatus", value: status } } as any)}
                            variant={bookingDetails.bookingStatus === status ? "default" : "outline"}
                            className={
                              bookingDetails.bookingStatus === status
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                            }
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
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Location Details */}
              <Card className="border-emerald-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-emerald-700">
                    <MapPin className="mr-2 h-5 w-5" />
                    場所詳細
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-emerald-700">都道府県</Label>
                      <Select 
                        value={bookingDetails.prefecture} 
                        onValueChange={(value) => handleInputChange({ target: { name: "prefecture", value } } as any)}
                      >
                        <SelectTrigger className="border-emerald-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="東京都">東京都</SelectItem>
                          <SelectItem value="神奈川県">神奈川県</SelectItem>
                          <SelectItem value="埼玉県">埼玉県</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-emerald-700">地区</Label>
                      <Select 
                        value={bookingDetails.district} 
                        onValueChange={(value) => handleInputChange({ target: { name: "district", value } } as any)}
                      >
                        <SelectTrigger className="border-emerald-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="豊島区">豊島区</SelectItem>
                          <SelectItem value="新宿区">新宿区</SelectItem>
                          <SelectItem value="渋谷区">渋谷区</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-emerald-700">詳細場所</Label>
                    <Textarea 
                      value={bookingDetails.specificLocation} 
                      onChange={handleInputChange}
                      name="specificLocation"
                      placeholder="例: グランドホテル 605号室"
                      className="border-emerald-200"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Options */}
              <Card className="border-emerald-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-emerald-700">
                    <Users className="mr-2 h-5 w-5" />
                    オプション・追加サービス
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {availableOptions.map((option) => (
                      <div key={option.id} className="flex items-center justify-between p-3 border border-emerald-100 rounded-lg">
                        <div className="flex items-center">
                          <Checkbox
                            id={option.id}
                            checked={bookingDetails.options[option.name] || false}
                            onCheckedChange={(checked) => handleCheckboxChange(option.name, checked as boolean)}
                            className="border-emerald-300"
                          />
                          <Label htmlFor={option.id} className="ml-3 text-emerald-700 font-medium">
                            {option.name}
                          </Label>
                        </div>
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                          {option.price === 0 ? "無料" : `+${option.price.toLocaleString()}円`}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card className="border-emerald-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-emerald-700">
                    <CreditCard className="mr-2 h-5 w-5" />
                    お支払い方法
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select 
                    value={bookingDetails.paymentMethod} 
                    onValueChange={(value) => handleInputChange({ target: { name: "paymentMethod", value } } as any)}
                  >
                    <SelectTrigger className="border-emerald-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="現金">現金</SelectItem>
                      <SelectItem value="クレジットカード">クレジットカード</SelectItem>
                      <SelectItem value="ポイント利用">ポイント利用</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Booking Summary */}
              <Card className="border-emerald-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-emerald-700">
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
                        <span className="ml-2 font-semibold">{bookingDetails.date} {bookingDetails.time}</span>
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
              <Card className="border-emerald-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-emerald-700">料金内訳</CardTitle>
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
                    <div className="flex justify-between font-bold text-lg">
                      <span>合計</span>
                      <span className="text-emerald-600">{totalPrice.toLocaleString()}円</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="border-t border-gray-200 pt-4 px-6 pb-6">
          <div className="flex justify-between">
            <Button
              onClick={prevStep}
              disabled={currentStep === 1}
              variant="outline"
              className="border-emerald-300 text-emerald-600 hover:bg-emerald-50"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              戻る
            </Button>
            
            {currentStep < totalSteps ? (
              <Button
                onClick={nextStep}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                次へ
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Check className="mr-1 h-4 w-4" />
                予約を確定
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
