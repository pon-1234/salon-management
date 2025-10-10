'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import {
  Phone,
  Clock,
  User,
  MapPin,
  CreditCard,
  DollarSign,
  ChevronRight,
  ChevronLeft,
  Check,
  Calendar,
  Users,
  Loader2,
} from 'lucide-react'
import { Customer } from '@/lib/customer/types'
import { Cast } from '@/lib/cast/types'
import { usePricing } from '@/hooks/use-pricing'
import { useAvailability } from '@/hooks/use-availability'
import { TimeSlotPicker } from './time-slot-picker'
import { toast } from '@/hooks/use-toast'
import { isVipMember } from '@/lib/utils'

type DesignationType = 'none' | 'regular' | 'special'

type PriceBreakdown = {
  basePrice: number
  designationFee: number
  optionsTotal: number
  transportationFee: number
  additionalFee: number
  total: number
}

const formatYen = (amount: number) => `${amount.toLocaleString()}円`

const getDesignationFeeAmount = (type: DesignationType, cast?: Cast) => {
  if (!cast) return 0
  if (type === 'special') {
    return cast.specialDesignationFee ?? 0
  }
  if (type === 'regular') {
    return cast.regularDesignationFee ?? 0
  }
  return 0
}

const getDesignationLabel = (type: DesignationType, cast?: Cast) => {
  if (!cast) return 'フリー'
  if (type === 'special' && cast.specialDesignationFee) {
    return '特別指名'
  }
  if (type === 'regular' && cast.regularDesignationFee) {
    return '本指名'
  }
  return 'フリー'
}

interface BookingDetails {
  customerName: string
  customerType: string
  phoneNumber: string
  points: number
  bookingStatus: string
  staffConfirmation: string
  customerConfirmation: string
  prefecture: string
  district: string
  location: string
  locationType: string
  specificLocation: string
  staff: string
  marketingChannel: string
  date: string
  time: string
  inOutTime: string
  freeExtension: string
  options: Record<string, boolean>
  transportationFee: number
  paymentMethod: string
  additionalFee: number
}

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
  selectedCustomer,
}: QuickBookingDialogProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 3

  // Get pricing data from centralized system
  const { courses, options, loading: pricingLoading } = usePricing()

  // Get available options for the selected staff
  const availableOptions = selectedStaff?.availableOptions
    ? options.filter((option) => selectedStaff.availableOptions.includes(option.id))
    : options
  const [bookingDetails, setBookingDetails] = useState<BookingDetails>({
    customerName: selectedCustomer?.name || '', // 更新
    customerType: isVipMember(selectedCustomer?.memberType) ? 'VIPメンバー' : '通常会員', // 更新
    phoneNumber: selectedCustomer?.phone || '', // 更新
    points: selectedCustomer?.points || 0, // 更新
    bookingStatus: '仮予約',
    staffConfirmation: '未確認',
    customerConfirmation: '未確認',
    prefecture: '東京都',
    district: '豊島区',
    location: '池袋（北口・西口）(0円)',
    locationType: 'ホテル利用',
    specificLocation: 'グランドホテル 605',
    staff: selectedStaff?.name || '', // Remove default "やぎ"
    marketingChannel: '店リピート',
    date: selectedTime ? format(selectedTime, 'yyyy-MM-dd') : '',
    time: selectedTime ? format(selectedTime, 'HH:mm') : '',
    inOutTime: '',
    freeExtension: '0',
    options: {},
    transportationFee: 0,
    paymentMethod: '現金',
    additionalFee: 0,
  })
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [designationType, setDesignationType] = useState<DesignationType>('none')

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId),
    [courses, selectedCourseId]
  )

  const designationOptions = useMemo(
    () => {
      const candidates: Array<{ type: DesignationType; label: string; fee: number }> = [
        { type: 'none', label: 'フリー', fee: 0 },
      ]

      if (selectedStaff?.regularDesignationFee) {
        candidates.push({
          type: 'regular',
          label: '本指名',
          fee: selectedStaff.regularDesignationFee,
        })
      }

      if (selectedStaff?.specialDesignationFee) {
        candidates.push({
          type: 'special',
          label: '特別指名',
          fee: selectedStaff.specialDesignationFee,
        })
      }

      return candidates
    },
    [selectedStaff]
  )

  const priceBreakdown = useMemo<PriceBreakdown>(
    () => {
      const basePrice = selectedCourse?.price ?? 0
      const designationFeeAmount = getDesignationFeeAmount(designationType, selectedStaff)
      const optionsTotal = availableOptions.reduce((sum, option) => {
        return bookingDetails.options[option.id] ? sum + option.price : sum
      }, 0)
      const transportationFee = bookingDetails.transportationFee || 0
      const additionalFee = bookingDetails.additionalFee || 0

      const total =
        basePrice + designationFeeAmount + optionsTotal + transportationFee + additionalFee

      return {
        basePrice,
        designationFee: designationFeeAmount,
        optionsTotal,
        transportationFee,
        additionalFee,
        total,
      }
    },
    [
      selectedCourse,
      designationType,
      selectedStaff,
      availableOptions,
      bookingDetails.options,
      bookingDetails.transportationFee,
      bookingDetails.additionalFee,
    ]
  )

  useEffect(() => {
    if (courses.length === 0) {
      return
    }

    const hasSelectedCourse = courses.some((course) => course.id === selectedCourseId)
    if (!selectedCourseId || !hasSelectedCourse) {
      setSelectedCourseId(courses[0].id)
    }
  }, [courses, selectedCourseId])

  useEffect(() => {
    setBookingDetails((prev) => {
      if (Object.keys(prev.options).length === 0) {
        return prev
      }

      const validOptionIds = new Set(availableOptions.map((option) => option.id))
      const filteredEntries = Object.entries(prev.options).filter(([optionId]) =>
        validOptionIds.has(optionId)
      )

      if (filteredEntries.length === Object.keys(prev.options).length) {
        return prev
      }

      return {
        ...prev,
        options: Object.fromEntries(filteredEntries),
      }
    })
  }, [availableOptions])

  useEffect(() => {
    if (!selectedTime) return
    setBookingDetails((prev) => ({
      ...prev,
      date: format(selectedTime, 'yyyy-MM-dd'),
      time: format(selectedTime, 'HH:mm'),
    }))
  }, [selectedTime])

  useEffect(() => {
    if (!selectedStaff) {
      setDesignationType('none')
      return
    }

    setBookingDetails((prev) => ({
      ...prev,
      staff: selectedStaff.name,
    }))

    setDesignationType((prev) => {
      if (prev === 'special' && selectedStaff.specialDesignationFee) {
        return prev
      }
      if (prev === 'regular' && selectedStaff.regularDesignationFee) {
        return prev
      }
      if (selectedStaff.regularDesignationFee) {
        return 'regular'
      }
      if (selectedStaff.specialDesignationFee) {
        return 'special'
      }
      return 'none'
    })
  }, [selectedStaff])

  useEffect(() => {
    if (selectedCustomer) {
      setBookingDetails((prev) => ({
        ...prev,
        customerName: selectedCustomer.name,
        customerType: isVipMember(selectedCustomer.memberType) ? 'VIPメンバー' : '通常会員',
        phoneNumber: selectedCustomer.phone,
        points: selectedCustomer.points,
      }))
    }
  }, [selectedCustomer])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setBookingDetails((prev) => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setBookingDetails((prev) => ({
      ...prev,
      options: { ...prev.options, [name]: checked },
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

  const { checkAvailability } = useAvailability()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!selectedStaff) {
      toast({
        title: '担当者未選択',
        description: '担当キャストを選択してください。',
        variant: 'destructive',
      })
      return
    }

    if (!selectedCourse) {
      toast({
        title: 'コース未選択',
        description: 'コースを選択してください。',
        variant: 'destructive',
      })
      return
    }

    if (!bookingDetails.date || !bookingDetails.time) {
      toast({
        title: '日時未設定',
        description: '予約日時を選択してください。',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSubmitting(true)

      // Parse selected time and course duration
      const [hours, minutes] = bookingDetails.time.split(':').map(Number)
      if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        throw new Error('予約時間の形式が正しくありません。')
      }
      const startTime = new Date(bookingDetails.date)
      startTime.setHours(hours, minutes, 0, 0)

      const endTime = new Date(startTime)
      endTime.setMinutes(endTime.getMinutes() + selectedCourse.duration)

      // Check availability before submitting
      const availability = await checkAvailability(selectedStaff.id, startTime, endTime)

      if (!availability.available) {
        toast({
          title: '予約不可',
          description: 'この時間帯は既に予約が入っています。別の時間を選択してください。',
          variant: 'destructive',
        })
        return
      }

      // Create reservation
      const response = await fetch('/api/reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer?.id,
          castId: selectedStaff.id,
          courseId: selectedCourseId,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          status: bookingDetails.bookingStatus === '確定済' ? 'confirmed' : 'pending',
          options: Object.entries(bookingDetails.options)
            .filter(([_, selected]) => selected)
            .map(([optionId]) => optionId),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          toast({
            title: '予約不可',
            description: data.error || 'この時間帯は予約できません。',
            variant: 'destructive',
          })
        } else {
          throw new Error(data.error || '予約の作成に失敗しました')
        }
        return
      }

      toast({
        title: '予約完了',
        description: '予約が正常に作成されました。',
      })

      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : '予約の作成に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const StepIndicator = () => (
    <div className="mb-6 flex items-center justify-center">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
              step === currentStep
                ? 'bg-gray-900 text-white'
                : step < currentStep
                  ? 'bg-gray-100 text-gray-900'
                  : 'bg-gray-200 text-gray-500'
            }`}
          >
            {step < currentStep ? <Check className="h-4 w-4" /> : step}
          </div>
          {step < 3 && (
            <div
              className={`mx-2 h-1 w-12 ${step < currentStep ? 'bg-gray-900' : 'bg-gray-200'}`}
            />
          )}
        </div>
      ))}
    </div>
  )

  const stepTitles = ['基本情報', '詳細設定', '確認・完了']

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">簡単受付</DialogTitle>
          <StepIndicator />
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800">{stepTitles[currentStep - 1]}</h3>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-2">
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Customer Information Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center">
                    <User className="mr-2 h-5 w-5" />
                    お客様情報
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{bookingDetails.customerName}</h3>
                        <Badge variant="secondary" className="mt-1">
                          {bookingDetails.customerType}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center">
                          <Phone className="mr-1 h-4 w-4" />
                          <span className="font-semibold">{bookingDetails.phoneNumber}</span>
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          現在 {bookingDetails.points}pt
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

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
                    <div className="col-span-2">
                      <Label>時間選択</Label>
                      {selectedStaff && bookingDetails.date && selectedCourse ? (
                        <TimeSlotPicker
                          castId={selectedStaff.id}
                          date={new Date(bookingDetails.date)}
                          duration={selectedCourse.duration}
                          selectedTime={bookingDetails.time}
                          onTimeSelect={(time) => {
                            const date = new Date(time)
                            const timeStr = format(date, 'HH:mm')
                            handleInputChange({ target: { name: 'time', value: timeStr } } as any)
                          }}
                        />
                      ) : (
                        <div className="rounded-lg bg-gray-50 p-4 text-center text-gray-500">
                          担当者・日付・コースを選択してください
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label>担当キャスト</Label>
                    <Input value={bookingDetails.staff} readOnly className="bg-gray-50" />
                  </div>

                  <div>
                    <Label>コース選択</Label>
                    <Select
                      value={selectedCourseId}
                      onValueChange={(value) => setSelectedCourseId(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="コースを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {pricingLoading ? (
                          <div className="px-4 py-2 text-sm text-gray-500">読み込み中...</div>
                        ) : courses.length === 0 ? (
                          <div className="px-4 py-2 text-sm text-gray-500">
                            利用可能なコースがありません
                          </div>
                        ) : (
                          courses.map((course) => (
                            <SelectItem key={course.id} value={course.id}>
                              {course.name} {course.duration}分 {course.price.toLocaleString()}円
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Designation Settings */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center">
                    <DollarSign className="mr-2 h-5 w-5" />
                    指名設定
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {designationOptions.map((option) => (
                      <Button
                        key={option.type}
                        type="button"
                        size="sm"
                        variant={designationType === option.type ? 'default' : 'outline'}
                        onClick={() => setDesignationType(option.type)}
                      >
                        {option.label}
                        <span className="ml-2 text-xs text-gray-500">
                          {option.fee > 0 ? formatYen(option.fee) : '0円'}
                        </span>
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    選択中: {getDesignationLabel(designationType, selectedStaff)}
                    {priceBreakdown.designationFee > 0
                      ? `（${formatYen(priceBreakdown.designationFee)}）`
                      : ''}
                  </p>
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
                      <div className="mt-2 flex flex-wrap gap-2">
                        {['仮予約', 'ネット予約', '事前予約', '当日予約', '確定済'].map(
                          (status) => (
                            <Button
                              key={status}
                              type="button"
                              size="sm"
                              onClick={() =>
                                handleInputChange({
                                  target: { name: 'bookingStatus', value: status },
                                } as any)
                              }
                              variant={
                                bookingDetails.bookingStatus === status ? 'default' : 'outline'
                              }
                            >
                              {status}
                            </Button>
                          )
                        )}
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
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center">
                    <MapPin className="mr-2 h-5 w-5" />
                    場所詳細
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>都道府県</Label>
                      <Select
                        value={bookingDetails.prefecture}
                        onValueChange={(value) =>
                          handleInputChange({ target: { name: 'prefecture', value } } as any)
                        }
                      >
                        <SelectTrigger>
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
                      <Label>地区</Label>
                      <Select
                        value={bookingDetails.district}
                        onValueChange={(value) =>
                          handleInputChange({ target: { name: 'district', value } } as any)
                        }
                      >
                        <SelectTrigger>
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
                    <Label>詳細場所</Label>
                    <Textarea
                      value={bookingDetails.specificLocation}
                      onChange={handleInputChange}
                      name="specificLocation"
                      placeholder="例: グランドホテル 605号室"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Options */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    オプション・追加サービス
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {availableOptions.map((option) => (
                      <div
                        key={option.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center">
                          <Checkbox
                            id={option.id}
                            checked={bookingDetails.options[option.name] || false}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(option.name, checked as boolean)
                            }
                          />
                          <Label htmlFor={option.id} className="ml-3 font-medium">
                            {option.name}
                          </Label>
                        </div>
                        <Badge variant="secondary">
                          {option.price === 0 ? '無料' : `+${option.price.toLocaleString()}円`}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center">
                    <CreditCard className="mr-2 h-5 w-5" />
                    お支払い方法
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={bookingDetails.paymentMethod}
                    onValueChange={(value) =>
                      handleInputChange({ target: { name: 'paymentMethod', value } } as any)
                    }
                  >
                    <SelectTrigger>
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
                        <span className="ml-2 font-semibold">
                          {selectedCourse
                            ? `${selectedCourse.name} ${selectedCourse.duration}分 ${formatYen(selectedCourse.price)}`
                            : '未選択'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">場所:</span>
                        <span className="ml-2 font-semibold">
                          {bookingDetails.specificLocation}
                        </span>
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
                      <span>{formatYen(priceBreakdown.basePrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{`${getDesignationLabel(designationType, selectedStaff)}料`}</span>
                      <span>{formatYen(priceBreakdown.designationFee)}</span>
                    </div>
                    {priceBreakdown.optionsTotal > 0 && (
                      <div className="flex justify-between">
                        <span>オプション</span>
                        <span>{formatYen(priceBreakdown.optionsTotal)}</span>
                      </div>
                    )}
                    {priceBreakdown.transportationFee > 0 && (
                      <div className="flex justify-between">
                        <span>交通費</span>
                        <span>{formatYen(priceBreakdown.transportationFee)}</span>
                      </div>
                    )}
                    {priceBreakdown.additionalFee > 0 && (
                      <div className="flex justify-between">
                        <span>追加料金</span>
                        <span>{formatYen(priceBreakdown.additionalFee)}</span>
                      </div>
                    )}
                    <hr className="my-2" />
                    <div className="flex justify-between text-lg font-bold">
                      <span>合計</span>
                      <span className="font-bold">{formatYen(priceBreakdown.total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="border-t px-6 pb-6 pt-4">
          <div className="flex justify-between">
            <Button onClick={prevStep} disabled={currentStep === 1} variant="outline">
              <ChevronLeft className="mr-1 h-4 w-4" />
              戻る
            </Button>

            {currentStep < totalSteps ? (
              <Button onClick={nextStep}>
                次へ
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    処理中...
                  </>
                ) : (
                  <>
                    <Check className="mr-1 h-4 w-4" />
                    予約を確定
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
