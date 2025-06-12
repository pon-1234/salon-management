"use client"

import { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { DatePicker } from "@/components/ui/date-picker"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { MessageSquare, Crown, Calendar, Clock, Phone, Mail, Edit3, Save, X, TrendingUp, TrendingDown, Minus, RefreshCw, UserX, Plus, Trash2, FileText, Edit, Calendar as CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { Customer, CustomerUsageRecord, CustomerPointHistory, NgCastEntry } from "@/lib/customer/types"
import { Reservation } from "@/lib/types/reservation"
import { Cast } from "@/lib/cast/types"
import { getCustomerUsageHistory, getCustomerPointHistory } from "@/lib/customer/data"
import { getReservationsByCustomerId } from "@/lib/reservation/data"
import { getAllCasts } from "@/lib/cast/data"
import { NgCastDialog } from "@/components/customer/ng-cast-dialog"
import { ReservationDialog } from "@/components/reservation/reservation-dialog"
import { ReservationData } from "@/lib/types/reservation"

const formSchema = z.object({
  name: z.string().min(1, '名前は必須です'),
  phone: z.string().min(1, '電話番号は必須です'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください').max(32, 'パスワードは32文字以下で入力してください'),
  birthDate: z.date({
    required_error: '生年月日を選択してください',
  }),
  memberType: z.enum(['regular', 'vip']),
  smsEnabled: z.boolean(),
  notes: z.string().max(1000, '特徴や好みは1000文字以内で入力してください').optional(),
  points: z.number().min(0),
  pointsToAdd: z.number().min(0).optional(),
  pointsAmount: z.number().min(0).optional(),
})

type FormData = z.infer<typeof formSchema>

export default function CustomerProfile({ params }: { params: { id: string } }) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [usageHistory, setUsageHistory] = useState<CustomerUsageRecord[]>([])
  const [pointHistory, setPointHistory] = useState<CustomerPointHistory[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [availableCasts, setAvailableCasts] = useState<Cast[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [pointsInputEnabled, setPointsInputEnabled] = useState(false)
  const [ngCastDialogOpen, setNgCastDialogOpen] = useState(false)
  const [editingNgCast, setEditingNgCast] = useState<NgCastEntry | null>(null)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const router = useRouter()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      password: '',
      memberType: 'regular',
      smsEnabled: false,
      notes: '',
      points: 0,
      pointsToAdd: 0,
      pointsAmount: 0,
    },
  })

  const calculateAge = (birthDate: Date) => {
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const birthDate = form.watch('birthDate')
  const age = birthDate ? calculateAge(birthDate) : null

  useEffect(() => {
    // Mock customer data - in a real app, fetch from API
    const mockCustomer: Customer = {
      id: params.id,
      name: 'ダミー',
      nameKana: 'ダミー',
      phone: '09012345678',
      email: 'dummy@example.com',
      password: '********',
      birthDate: new Date(1990, 0, 1),
      age: 34,
      memberType: 'regular',
      smsEnabled: true,
      points: 4900,
      registrationDate: new Date(2023, 8, 2, 22, 44, 53),
      lastLoginDate: new Date(2023, 9, 9, 22, 57, 24),
      lastVisitDate: new Date(2023, 6, 7),
      notes: '',
      ngCastIds: ['2', '4'],
      ngCasts: [
        {
          castId: '2',
          notes: '接客態度に問題があった',
          addedDate: new Date(2023, 8, 15)
        },
        {
          castId: '4',
          notes: 'お客様との相性が合わなかった',
          addedDate: new Date(2023, 9, 2)
        }
      ],
    }

    setCustomer(mockCustomer)
    
    // Set form values
    form.reset({
      name: mockCustomer.name,
      phone: mockCustomer.phone,
      email: mockCustomer.email,
      password: mockCustomer.password,
      birthDate: mockCustomer.birthDate,
      memberType: mockCustomer.memberType,
      smsEnabled: mockCustomer.smsEnabled,
      notes: mockCustomer.notes || '',
      points: mockCustomer.points,
      pointsToAdd: 0,
      pointsAmount: 0,
    })

    // Fetch customer usage history
    getCustomerUsageHistory(params.id).then(setUsageHistory)

    // Fetch customer point history
    getCustomerPointHistory(params.id).then(setPointHistory)

    // Fetch customer reservations
    getReservationsByCustomerId(params.id).then(setReservations)
    
    // Fetch available casts
    setAvailableCasts(getAllCasts())
  }, [params.id, form])

  const handleBooking = () => {
    router.push(`/reservation?customerId=${params.id}`)
  }

  const handleSave = (data: FormData) => {
    console.log('Customer updated:', { ...data, age })
    setIsEditing(false)
    // In a real app, save to API
  }

  const handleCancel = () => {
    setIsEditing(false)
    // Reset form to original values
    if (customer) {
      form.reset({
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        password: customer.password,
        birthDate: customer.birthDate,
        memberType: customer.memberType,
        smsEnabled: customer.smsEnabled,
        notes: customer.notes || '',
        points: customer.points,
        pointsToAdd: 0,
        pointsAmount: 0,
      })
    }
  }

  const handleAddNgCast = () => {
    setEditingNgCast(null)
    setNgCastDialogOpen(true)
  }

  const handleEditNgCast = (ngCast: NgCastEntry) => {
    setEditingNgCast(ngCast)
    setNgCastDialogOpen(true)
  }

  const handleSaveNgCast = (ngCast: NgCastEntry) => {
    if (!customer) return

    let updatedNgCasts = [...(customer.ngCasts || [])]
    let updatedNgCastIds = [...(customer.ngCastIds || [])]

    if (editingNgCast) {
      // Editing existing NG cast
      const index = updatedNgCasts.findIndex(ng => ng.castId === editingNgCast.castId)
      if (index >= 0) {
        updatedNgCasts[index] = ngCast
      }
    } else {
      // Adding new NG cast
      updatedNgCasts.push(ngCast)
      if (!updatedNgCastIds.includes(ngCast.castId)) {
        updatedNgCastIds.push(ngCast.castId)
      }
    }

    setCustomer({
      ...customer,
      ngCasts: updatedNgCasts,
      ngCastIds: updatedNgCastIds
    })
  }

  const handleRemoveNgCast = (castId: string) => {
    if (!customer) return

    const updatedNgCasts = customer.ngCasts?.filter(ng => ng.castId !== castId) || []
    const updatedNgCastIds = customer.ngCastIds?.filter(id => id !== castId) || []

    setCustomer({
      ...customer,
      ngCasts: updatedNgCasts,
      ngCastIds: updatedNgCastIds
    })
  }

  // 予約データをダイアログ用に変換
  const convertToReservationData = (reservation: Reservation): ReservationData | null => {
    if (!reservation) return null;
    
    return {
      id: reservation.id,
      customerId: reservation.customerId,
      customerName: customer?.name || `顧客${reservation.customerId}`,
      customerType: customer?.memberType === 'vip' ? 'VIPメンバー' : '通常顧客',
      phoneNumber: customer?.phone || "090-1234-5678",
      points: customer?.points || 100,
      bookingStatus: reservation.status,
      staffConfirmation: "確認済み",
      customerConfirmation: "確認済み", 
      prefecture: "東京都",
      district: "渋谷区",
      location: "アパホテル",
      locationType: "ホテル",
      specificLocation: "502号室",
      staff: `スタッフ${reservation.staffId}`,
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

  if (!customer) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">顧客情報</h1>
          <div className="flex items-center gap-3 mt-3">
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              <Crown className="w-4 h-4 mr-1" />
              {customer.memberType === 'vip' ? 'VIPメンバー' : '通常会員'}
            </Badge>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              レギュラーステージ
            </Badge>
            <Badge variant="outline" className="bg-gray-50 text-gray-600">
              ポイント残高: {customer.points.toLocaleString()}pt
            </Badge>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={handleBooking}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            新規予約
          </Button>
          {!isEditing ? (
            <Button 
              onClick={() => setIsEditing(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              編集
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button 
                onClick={form.handleSubmit(handleSave)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <Save className="w-4 h-4" />
                保存
              </Button>
              <Button 
                onClick={handleCancel}
                variant="outline"
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                キャンセル
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 予約情報カード */}
      <Card className={`shadow-sm ${reservations.length > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className={`w-5 h-5 ${reservations.length > 0 ? 'text-emerald-600' : 'text-gray-500'}`} />
              現在の予約情報
              {reservations.length > 0 && (
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                  {reservations.length}件
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reservations.length > 0 ? (
            <div className="space-y-3">
              {reservations
                .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
                .map((reservation) => {
                  const isToday = new Date(reservation.startTime).toDateString() === new Date().toDateString();
                  const isTomorrow = new Date(reservation.startTime).toDateString() === new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString();
                  
                  return (
                    <div 
                      key={reservation.id} 
                      className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${
                        isToday 
                          ? 'bg-orange-50 border-orange-200 shadow-md' 
                          : isTomorrow
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-white border-emerald-100'
                      }`}
                    >
                      <div className="shrink-0">
                        <img
                          src="/placeholder.svg"
                          alt="Staff"
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">スタッフ名</h3>
                          <Badge variant={reservation.status === 'confirmed' ? 'default' : 'secondary'}>
                            {reservation.status === 'confirmed' ? '予約確定' : 
                             reservation.status === 'modifiable' ? '修正可能' : '仮予約'}
                          </Badge>
                          {isToday && (
                            <Badge variant="destructive" className="text-xs">
                              本日
                            </Badge>
                          )}
                          {isTomorrow && (
                            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700">
                              明日
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {reservation.startTime.toLocaleDateString('ja-JP')}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {`${reservation.startTime.toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'})} - ${reservation.endTime.toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'})}`}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`font-medium ${isToday ? 'text-orange-600' : isTomorrow ? 'text-blue-600' : 'text-emerald-600'}`}>
                          ¥{reservation.price.toLocaleString()}
                        </div>
                        <Button 
                          variant="link" 
                          className={`text-sm p-0 ${isToday ? 'text-orange-600' : isTomorrow ? 'text-blue-600' : 'text-emerald-600'}`}
                          onClick={() => setSelectedReservation(reservation)}
                        >
                          予約詳細
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium mb-2">予約はありません</p>
              <p className="text-sm">新しい予約を作成してください</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-white border">
          <TabsTrigger value="profile" className="data-[state=active]:bg-emerald-50">基本情報</TabsTrigger>
          <TabsTrigger value="ng-cast" className="data-[state=active]:bg-emerald-50">NGキャスト</TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-emerald-50">利用履歴</TabsTrigger>
          <TabsTrigger value="points" className="data-[state=active]:bg-emerald-50">ポイント履歴</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
              {/* 基本情報 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">基本情報</CardTitle>
                  <CardDescription>顧客の基本的な情報</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">名前 <span className="text-red-500">*</span></FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input {...field} disabled={!isEditing} />
                            </FormControl>
                            <Button 
                              type="button"
                              className="shrink-0 bg-blue-500 hover:bg-blue-600"
                              onClick={() => router.push('/chat')}
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              メッセージ
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">電話番号 <span className="text-red-500">*</span></FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input {...field} disabled={!isEditing} />
                            </FormControl>
                            <Button 
                              type="button"
                              variant="destructive" 
                              className="shrink-0"
                            >
                              <Phone className="w-4 h-4 mr-2" />
                              電話
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">メールアドレス <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input type="email" {...field} disabled={!isEditing} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">パスワード <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input type="password" {...field} disabled={!isEditing} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="birthDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">生年月日 <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            {isEditing ? (
                              <DatePicker
                                selected={field.value}
                                onSelect={field.onChange}
                              />
                            ) : (
                              <Input 
                                value={field.value ? field.value.toLocaleDateString('ja-JP') : ''} 
                                disabled 
                              />
                            )}
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div>
                      <Label className="text-sm font-medium text-gray-700">年齢</Label>
                      <div className="mt-2 px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-900">
                        {age !== null ? `${age}歳` : '生年月日から自動計算'}
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="memberType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">会員タイプ</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isEditing}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="regular">通常会員</SelectItem>
                              <SelectItem value="vip">VIPメンバー</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">登録日</Label>
                      <div className="mt-2 px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-900">
                        {customer.registrationDate.toLocaleString('ja-JP')}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700">最終ログイン</Label>
                      <div className="mt-2 px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-900">
                        {customer.lastLoginDate ? customer.lastLoginDate.toLocaleString('ja-JP') : 'N/A'}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700">最終利用日</Label>
                      <div className="mt-2 px-3 py-2 bg-gray-50 rounded-md text-sm text-gray-900">
                        {customer.lastVisitDate ? customer.lastVisitDate.toLocaleDateString('ja-JP') : 'N/A'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ポイント情報 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">ポイント情報</CardTitle>
                  <CardDescription>現在のポイント残高とポイント追加</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="points"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">ポイント残高</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input 
                              {...field} 
                              type="number" 
                              disabled 
                              className="bg-gray-50"
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                            <span className="text-sm text-gray-600">pt</span>
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {isEditing && (
                    <>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={pointsInputEnabled}
                          onCheckedChange={setPointsInputEnabled}
                        />
                        <Label>ポイントを追加する</Label>
                      </div>
                      
                      {pointsInputEnabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="pointsAmount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">金額（円）</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="1000" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="pointsToAdd"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">ポイント</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="100" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* 連絡設定 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">連絡設定</CardTitle>
                  <CardDescription>SMS送信の設定</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="smsEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">SMS受信設定</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            ONにするとSMS送信が可能になります
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!isEditing}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* 特徴や好み */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">特徴や好み</CardTitle>
                  <CardDescription>顧客の特徴、好み、注意事項など（1000文字以内）</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder="顧客の特徴、好み、注意事項など"
                            className="min-h-[120px] resize-none"
                            disabled={!isEditing}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="ng-cast">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <UserX className="w-5 h-5" />
                NGキャスト管理
              </CardTitle>
              <CardDescription>この顧客がNGとしているキャストの管理</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* ヘッダーアクション */}
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-sm text-gray-700">
                  現在のNGキャスト ({customer?.ngCasts?.length || 0}件)
                </h3>
                <Button
                  size="sm"
                  onClick={handleAddNgCast}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  NGキャスト追加
                </Button>
              </div>

              {/* 現在のNGキャスト一覧 */}
              {customer?.ngCasts && customer.ngCasts.length > 0 ? (
                <div className="space-y-3">
                  {customer.ngCasts.map((ngCast) => {
                    const cast = availableCasts.find(c => c.id === ngCast.castId)
                    if (!cast) return null
                    return (
                      <div key={ngCast.castId} className="p-4 border rounded-lg bg-red-50 border-red-200">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <img
                              src={cast.image || "/placeholder.svg"}
                              alt={cast.name}
                              className="w-10 aspect-[7/10] rounded object-cover shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{cast.name}</h4>
                                <span className="text-sm text-gray-600">({cast.type})</span>
                              </div>
                              {ngCast.notes && (
                                <div className="flex items-start gap-1 mb-2">
                                  <FileText className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                                  <p className="text-sm text-gray-700 break-words">{ngCast.notes}</p>
                                </div>
                              )}
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <CalendarIcon className="w-3 h-3" />
                                追加日: {ngCast.addedDate.toLocaleDateString('ja-JP')}
                              </div>
                            </div>
                          </div>
                          {isEditing && (
                            <div className="flex gap-2 shrink-0 ml-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditNgCast(ngCast)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRemoveNgCast(ngCast.castId)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <UserX className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium mb-2">NGキャストはありません</p>
                  <p className="text-sm">必要に応じてNGキャストを追加してください</p>
                  <Button
                    className="mt-4 bg-red-600 hover:bg-red-700"
                    onClick={handleAddNgCast}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    NGキャスト追加
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">利用履歴</CardTitle>
              <CardDescription>過去の利用記録</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {usageHistory.map((record) => (
                  <div key={record.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="shrink-0">
                      <img
                        src="/placeholder.svg"
                        alt="Staff"
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{record.staffName}</h3>
                        <Badge variant={record.status === 'completed' ? 'default' : 'secondary'}>
                          {record.status === 'completed' ? '完了' : 'キャンセル'}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500 mt-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {record.date.toLocaleDateString('ja-JP')}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {record.serviceName}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-medium text-lg">¥{record.amount.toLocaleString()}</div>
                      <Button 
                        variant="link" 
                        className="text-sm p-0 text-emerald-600"
                        onClick={() => {
                          // 利用履歴から対応する予約を探す（簡易実装）
                          const relatedReservation = reservations.find(r => 
                            r.startTime.toDateString() === record.date.toDateString()
                          );
                          if (relatedReservation) {
                            setSelectedReservation(relatedReservation);
                          }
                        }}
                      >
                        詳細を見る
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="points">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">ポイント履歴</CardTitle>
              <CardDescription>ポイントの獲得・利用・期限切れの記録</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pointHistory.map((record) => {
                  const getIcon = () => {
                    switch (record.type) {
                      case 'earned':
                        return <TrendingUp className="w-4 h-4 text-emerald-600" />
                      case 'used':
                        return <TrendingDown className="w-4 h-4 text-red-600" />
                      case 'expired':
                        return <Minus className="w-4 h-4 text-gray-500" />
                      case 'adjusted':
                        return <RefreshCw className="w-4 h-4 text-blue-600" />
                      default:
                        return <Minus className="w-4 h-4 text-gray-500" />
                    }
                  }

                  const getTypeLabel = () => {
                    switch (record.type) {
                      case 'earned':
                        return '獲得'
                      case 'used':
                        return '利用'
                      case 'expired':
                        return '期限切れ'
                      case 'adjusted':
                        return '調整'
                      default:
                        return record.type
                    }
                  }

                  const getAmountColor = () => {
                    switch (record.type) {
                      case 'earned':
                      case 'adjusted':
                        return record.amount > 0 ? 'text-emerald-600' : 'text-red-600'
                      case 'used':
                      case 'expired':
                        return 'text-red-600'
                      default:
                        return 'text-gray-600'
                    }
                  }

                  return (
                    <div key={record.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
                        {getIcon()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant={record.type === 'earned' ? 'default' : record.type === 'used' ? 'destructive' : 'secondary'}>
                            {getTypeLabel()}
                          </Badge>
                          <h3 className="font-medium text-sm">{record.description}</h3>
                        </div>
                        <div className="text-sm text-gray-500 mt-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {record.date.toLocaleDateString('ja-JP')} {record.date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {record.relatedService && (
                            <div className="text-xs text-gray-400">
                              関連サービス: {record.relatedService}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`font-medium text-lg ${getAmountColor()}`}>
                          {record.amount > 0 ? '+' : ''}{record.amount.toLocaleString()}pt
                        </div>
                        <div className="text-sm text-gray-500">
                          残高: {record.balance.toLocaleString()}pt
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* NGキャストダイアログ */}
      <NgCastDialog
        open={ngCastDialogOpen}
        onOpenChange={setNgCastDialogOpen}
        availableCasts={availableCasts}
        existingNgCasts={customer?.ngCasts || []}
        editingNgCast={editingNgCast}
        onSave={handleSaveNgCast}
      />

      {/* 予約詳細ダイアログ */}
      <ReservationDialog
        open={!!selectedReservation}
        onOpenChange={(open) => !open && setSelectedReservation(null)}
        reservation={selectedReservation ? convertToReservationData(selectedReservation) : null}
      />
    </div>
  )
}