"use client"

import { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MessageSquare, Crown, Calendar, Clock, Phone, Mail } from 'lucide-react'
import { Customer, CustomerUsageRecord } from "@/lib/customer/types"
import { Reservation } from "@/lib/types/reservation"
import { getCustomerUsageHistory } from "@/lib/customer/data"
import { getReservationsByCustomerId } from "@/lib/reservation/data"

export default function CustomerProfile({ params }: { params: { id: string } }) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [usageHistory, setUsageHistory] = useState<CustomerUsageRecord[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [smsEnabled, setSmsEnabled] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Fetch customer data
    // This is a placeholder. In a real application, you would fetch the customer data from an API.
    setCustomer({
      id: params.id,
      name: 'ダミー',
      nameKana: 'ダミー',
      phone: '09012345678',
      email: 'dummy@example.com',
      birthDate: new Date(1990, 0, 1),
      memberType: 'regular',
      smsEnabled: true,
      points: 4900,
      lastVisitDate: new Date(2023, 6, 7),
      notes: '',
    })

    // Fetch customer usage history
    getCustomerUsageHistory(params.id).then(setUsageHistory)

    // Fetch customer reservations
    getReservationsByCustomerId(params.id).then(setReservations)
  }, [params.id])

  const handleBooking = () => {
    router.push(`/reservation?customerId=${params.id}`)
  }

  if (!customer) {
    return <div>Loading...</div>
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold">顧客情報</h1>
            <div className="flex items-center gap-2 mt-2">
              <Select defaultValue={customer.memberType}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">通常会員</SelectItem>
                  <SelectItem value="vip">VIPメンバー</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                <Crown className="w-4 h-4 mr-1" />
                レギュラーステージ
              </Badge>
            </div>
          </div>
        </div>

        {/* 予約情報を最上部に常時表示 */}
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
                  .sort((a, b) => a.startTime.getTime() - b.startTime.getTime()) // 日時順でソート
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
                          <Button variant="link" className={`text-sm p-0 ${isToday ? 'text-orange-600' : isTomorrow ? 'text-blue-600' : 'text-emerald-600'}`}>
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

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="bg-white border">
            <TabsTrigger value="profile" className="data-[state=active]:bg-emerald-50">基本情報</TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-emerald-50">利用履歴</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle>基本情報</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {/* 登録店 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">登録店</label>
                    <div className="text-lg font-medium">金の玉クラブ(池袋)</div>
                  </div>

                  {/* 名前 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">名前</label>
                    <div className="flex gap-2">
                      <Input defaultValue={customer.name} />
                      <Button className="shrink-0 bg-blue-500 hover:bg-blue-600">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        メッセージを送る
                      </Button>
                    </div>
                  </div>

                  {/* TEL */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">TEL (電話番号認証済)</label>
                    <div className="flex gap-2">
                      <Input defaultValue={customer.phone} />
                      <Button variant="destructive" className="shrink-0">
                        電話をかける
                      </Button>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="sms"
                          checked={smsEnabled}
                          onCheckedChange={(checked) => setSmsEnabled(checked as boolean)}
                        />
                        <label htmlFor="sms" className="text-sm">SMS送信NG</label>
                      </div>
                    </div>
                  </div>

                  {/* 年齢確認 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">年齢確認</label>
                    <div className="flex items-center gap-2">
                      <Checkbox defaultChecked id="age-verified" />
                      <label htmlFor="age-verified" className="text-sm">確認済</label>
                    </div>
                  </div>

                  {/* メール */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">メール</label>
                    <Input defaultValue={customer.email} />
                  </div>

                  {/* パスワード */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">パスワード</label>
                    <Input type="password" defaultValue="0000" />
                  </div>

                  {/* ポイント */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">ポイント</label>
                    <div className="flex items-center gap-2">
                      <Input defaultValue={customer.points.toString()} />
                      <span>pt</span>
                    </div>
                  </div>

                  {/* 生年月日 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">生年月日</label>
                    <div className="flex items-center gap-2">
                      <Select defaultValue={customer.birthDate.getFullYear().toString()}>
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={customer.birthDate.getFullYear().toString()}>{customer.birthDate.getFullYear()}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select defaultValue={(customer.birthDate.getMonth() + 1).toString().padStart(2, '0')}>
                        <SelectTrigger className="w-[80px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={(customer.birthDate.getMonth() + 1).toString().padStart(2, '0')}>{(customer.birthDate.getMonth() + 1).toString().padStart(2, '0')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select defaultValue={customer.birthDate.getDate().toString().padStart(2, '0')}>
                        <SelectTrigger className="w-[80px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={customer.birthDate.getDate().toString().padStart(2, '0')}>{customer.birthDate.getDate().toString().padStart(2, '0')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <span>日</span>
                      <Input defaultValue={(new Date().getFullYear() - customer.birthDate.getFullYear()).toString()} className="w-[80px]" />
                      <span>歳</span>
                    </div>
                  </div>

                  {/* 登録日/最終ログイン */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">登録日/最終ログイン</label>
                    <div className="flex gap-2">
                      <div className="text-sm bg-gray-100 p-2 rounded">2023-09-02 22:44:53</div>
                      <div className="text-sm bg-gray-100 p-2 rounded">2023-10-09 22:57:24</div>
                    </div>
                  </div>

                  {/* 最終利用日 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">最終利用日</label>
                    <div className="text-sm bg-gray-100 p-2 rounded w-fit">
                      {customer.lastVisitDate ? customer.lastVisitDate.toISOString().split('T')[0] : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* 特徴や好みのタイプ */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">特徴や好みのタイプ</label>
                  <Textarea className="min-h-[100px]" defaultValue={customer.notes} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle>利用履歴</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {usageHistory.map((record) => (
                    <div key={record.id} className="flex items-start gap-4 p-4 border rounded-lg">
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
                          <Badge variant="outline">{record.status === 'completed' ? '完了' : 'キャンセル'}</Badge>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {record.date.toISOString().split('T')[0]}
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {record.serviceName}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-medium">¥{record.amount.toLocaleString()}</div>
                        <Button variant="link" className="text-sm p-0">
                          詳細を見る
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
        <div className="mt-6 flex justify-end">
          <Button variant="outline" className="px-6 py-2">
            情報を更新
          </Button>
        </div>
      </div>
    </>
  )
}
