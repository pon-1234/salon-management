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
import { format } from "date-fns"
import { ja } from 'date-fns/locale'
import { Phone } from 'lucide-react'
import { Customer } from "@/lib/customer/types";

interface QuickBookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedStaff?: {
    id: string
    name: string
  }
  selectedTime?: Date
  selectedCustomer: Customer | null  // 追加
}

export function QuickBookingDialog({
  open,
  onOpenChange,
  selectedStaff,
  selectedTime,
  selectedCustomer  // 追加
}: QuickBookingDialogProps) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-white border border-gray-200">
        <div className="flex-1 overflow-y-auto pr-4">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center text-emerald-600">簡単受付</DialogTitle>
          </DialogHeader>

          <form className="space-y-6">
            {/* Customer Information */}
            <div className="bg-emerald-50 p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-emerald-700">{bookingDetails.customerName}</h3>
                  <p className="text-sm text-emerald-600">{bookingDetails.customerType}</p>
                </div>
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-emerald-500 mr-2" />
                  <span className="text-lg font-semibold text-emerald-700">{bookingDetails.phoneNumber}</span>
                </div>
              </div>
              <div className="mt-2">
                <span className="text-sm text-emerald-600">現在 {bookingDetails.points}pt</span>
              </div>
            </div>

            {/* Booking Status */}
            <div className="space-y-2">
              <Label className="text-emerald-700">レベル</Label>
              <div className="flex flex-wrap gap-2">
                {["仮予約", "ネット予約", "事前予約", "当日予約", "確定済", "終了"].map((status) => (
                  <Button
                    key={status}
                    type="button"
                    onClick={() => handleInputChange({ target: { name: "bookingStatus", value: status } } as any)}
                    variant={bookingDetails.bookingStatus === status ? "default" : "outline"}
                    className={
                      bookingDetails.bookingStatus === status
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                    }
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </div>

            {/* Confirmation Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-emerald-700">女性確認</Label>
                <div className="text-red-500">{bookingDetails.staffConfirmation}</div>
              </div>
              <div>
                <Label className="text-emerald-700">お客様確認</Label>
                <div className="text-red-500">{bookingDetails.customerConfirmation}</div>
              </div>
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="prefecture" className="text-emerald-700">都道府県</Label>
                <Select name="prefecture" value={bookingDetails.prefecture} onValueChange={(value) => handleInputChange({ target: { name: "prefecture", value } } as any)} className="border-gray-200 focus:border-emerald-500 focus:ring-emerald-500">
                  <SelectTrigger className="border-gray-200 focus:ring-emerald-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="東京都">東京都</SelectItem>
                    <SelectItem value="神奈川県">神奈川県</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="district" className="text-emerald-700">地区</Label>
                <Select name="district" value={bookingDetails.district} onValueChange={(value) => handleInputChange({ target: { name: "district", value } } as any)} className="border-gray-200 focus:border-emerald-500 focus:ring-emerald-500">
                  <SelectTrigger className="border-gray-200 focus:ring-emerald-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="豊島区">豊島区</SelectItem>
                    <SelectItem value="新宿区">新宿区</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="location" className="text-emerald-700">場所</Label>
              <Select name="location" value={bookingDetails.location} onValueChange={(value) => handleInputChange({ target: { name: "location", value } } as any)} className="border-gray-200 focus:border-emerald-500 focus:ring-emerald-500">
                <SelectTrigger className="border-gray-200 focus:ring-emerald-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="池袋（北口・西口）(0円)">池袋（北口・西口）(0円)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="locationType" className="text-emerald-700">利用タイプ</Label>
              <Select name="locationType" value={bookingDetails.locationType} onValueChange={(value) => handleInputChange({ target: { name: "locationType", value } } as any)} className="border-gray-200 focus:border-emerald-500 focus:ring-emerald-500">
                <SelectTrigger className="border-gray-200 focus:ring-emerald-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ホテル利用">ホテル利用</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="specificLocation" className="text-emerald-700">場所</Label>
              <Textarea 
                name="specificLocation" 
                value={bookingDetails.specificLocation} 
                onChange={handleInputChange}
                className="border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            {/* Staff and Marketing */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="staff" className="text-emerald-700">担当者</Label>
                <Input 
                  name="staff" 
                  value={bookingDetails.staff} 
                  readOnly 
                  className="bg-emerald-50 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>
              <div>
                <Label htmlFor="marketingChannel" className="text-emerald-700">営業媒体</Label>
                <Select name="marketingChannel" value={bookingDetails.marketingChannel} onValueChange={(value) => handleInputChange({ target: { name: "marketingChannel", value } } as any)} className="border-gray-200 focus:border-emerald-500 focus:ring-emerald-500">
                  <SelectTrigger className="border-gray-200 focus:ring-emerald-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="店リピート">店リピート</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date" className="text-emerald-700">日付</Label>
                <Input 
                  type="date" 
                  name="date" 
                  value={bookingDetails.date} 
                  readOnly 
                  className="bg-emerald-50 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>
              <div>
                <Label htmlFor="time" className="text-emerald-700">時間</Label>
                <Input 
                  type="time" 
                  name="time" 
                  value={bookingDetails.time} 
                  readOnly 
                  className="bg-emerald-50 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="inOutTime" className="text-emerald-700">IN&OUT</Label>
              <Input 
                name="inOutTime" 
                value={bookingDetails.inOutTime} 
                onChange={handleInputChange} 
                placeholder="例: 10:00 - 11:30" 
                className="border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            {/* Course Selection */}
            <div>
              <Label htmlFor="course" className="text-emerald-700">コース選択</Label>
              <Select name="course" value={bookingDetails.course} onValueChange={(value) => handleInputChange({ target: { name: "course", value } } as any)} className="border-gray-200 focus:border-emerald-500 focus:ring-emerald-500">
                <SelectTrigger className="border-gray-200 focus:ring-emerald-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="イベント70分 16,000円">イベント70分 16,000円</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Free Extension */}
            <div>
              <Label htmlFor="freeExtension" className="text-emerald-700">無料延長</Label>
              <Select name="freeExtension" value={bookingDetails.freeExtension} onValueChange={(value) => handleInputChange({ target: { name: "freeExtension", value } } as any)} className="border-gray-200 focus:border-emerald-500 focus:ring-emerald-500">
                <SelectTrigger className="border-gray-200 focus:ring-emerald-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0分</SelectItem>
                  <SelectItem value="10">10分</SelectItem>
                  <SelectItem value="20">20分</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Designation */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="designation" className="text-emerald-700">指名</Label>
                <Select name="designation" value={bookingDetails.designation} onValueChange={(value) => handleInputChange({ target: { name: "designation", value } } as any)} className="border-gray-200 focus:border-emerald-500 focus:ring-emerald-500">
                  <SelectTrigger className="border-gray-200 focus:ring-emerald-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="本指名 (2,000円)">本指名 (2,000円)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="designationFee" className="text-emerald-700">特別指名料</Label>
                <Select name="designationFee" value={bookingDetails.designationFee} onValueChange={(value) => handleInputChange({ target: { name: "designationFee", value } } as any)} className="border-gray-200 focus:border-emerald-500 focus:ring-emerald-500">
                  <SelectTrigger className="border-gray-200 focus:ring-emerald-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0円">0円</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Options */}
            <div>
              <Label className="text-emerald-700">オプション選択</Label>
              <div className="space-y-2">
                {Object.entries(bookingDetails.options).map(([option, checked]) => (
                  <div key={option} className="flex items-center">
                    <Checkbox
                      id={option}
                      checked={checked}
                      onCheckedChange={(checked) => handleCheckboxChange(option, checked as boolean)}
                      className="border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <Label htmlFor={option} className="ml-2 text-emerald-700">
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment and Discounts */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="transportationFee" className="text-emerald-700">交通費</Label>
                <Input 
                  type="number" 
                  name="transportationFee" 
                  value={bookingDetails.transportationFee} 
                  onChange={handleInputChange}
                  className="border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>
              <div>
                <Label htmlFor="paymentMethod" className="text-emerald-700">お支払い</Label>
                <Select name="paymentMethod" value={bookingDetails.paymentMethod} onValueChange={(value) => handleInputChange({ target: { name: "paymentMethod", value } } as any)} className="border-gray-200 focus:border-emerald-500 focus:ring-emerald-500">
                  <SelectTrigger className="border-gray-200 focus:ring-emerald-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="現金">現金</SelectItem>
                    <SelectItem value="クレジットカード">クレジットカード</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="discount" className="text-emerald-700">値引き</Label>
              <Input 
                name="discount" 
                value={bookingDetails.discount} 
                onChange={handleInputChange}
                className="border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            <div>
              <Label htmlFor="additionalFee" className="text-emerald-700">加算料金</Label>
              <Input 
                type="number" 
                name="additionalFee" 
                value={bookingDetails.additionalFee} 
                onChange={handleInputChange}
                className="border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            <div>
              <Label htmlFor="staffBonusFee" className="text-emerald-700">女性バック料金+</Label>
              <Input 
                type="number" 
                name="staffBonusFee" 
                value={bookingDetails.staffBonusFee} 
                onChange={handleInputChange}
                className="border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
          </form>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 pt-4">
          <div className="bg-emerald-50 p-4 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-emerald-700">お支払いTOTAL:</span>
              <span className="text-xl font-bold text-emerald-600">{totalPrice.toLocaleString()}円</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-emerald-600">店舗売上:</span>
              <span className="text-emerald-600">{bookingDetails.storeRevenue.toLocaleString()}円</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-emerald-600">女性売上:</span>
              <span className="text-emerald-600">{bookingDetails.staffRevenue.toLocaleString()}円</span>
            </div>
          </div>
          <Button type="submit" className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white">
            予約を確定する
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
