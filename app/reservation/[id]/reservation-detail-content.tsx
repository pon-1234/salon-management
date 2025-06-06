"use client"

import { useState, useEffect } from 'react'
import { ArrowLeft, Pencil, MessageSquare, Clock, Users, ArrowRight, MoreHorizontal, Phone, Printer, Share2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ModificationHistoryTable } from "@/components/reservation/modification-history-table"
import { getModificationHistory, getModificationAlerts } from "@/lib/modification-history/data"
import { getAllReservations } from "@/lib/reservation/data"
import { Reservation } from "@/lib/types/reservation"

interface ReservationDetailContentProps {
  reservationId: string
}

export function ReservationDetailContent({ reservationId }: ReservationDetailContentProps) {
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReservation = async () => {
      try {
        const reservations = await getAllReservations()
        const foundReservation = reservations.find(r => r.id === reservationId)
        setReservation(foundReservation || null)
      } catch (error) {
        console.error('予約の取得に失敗しました:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchReservation()
  }, [reservationId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">予約情報を読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!reservation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-4">予約が見つかりませんでした</p>
          <Link href="/reservation-list">
            <Button>予約一覧に戻る</Button>
          </Link>
        </div>
      </div>
    )
  }

  const modificationHistory = getModificationHistory(reservation.id)
  const modificationAlerts = getModificationAlerts(reservation.id)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'modifiable': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return '確定'
      case 'pending': return '仮予約'
      case 'cancelled': return 'キャンセル'
      case 'modifiable': return '修正可能'
      default: return status
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <Link href="/reservation-list">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  予約一覧
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">予約詳細</h1>
                <p className="text-sm text-gray-500">予約ID: {reservation.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Printer className="w-4 h-4 mr-2" />
                印刷
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                共有
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 顧客情報カード */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{reservation.customerName} 様</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={getStatusColor(reservation.status)}>
                      {getStatusText(reservation.status)}
                    </Badge>
                    <Badge variant="outline">
                      <Phone className="w-3 h-3 mr-1" />
                      連絡可能
                    </Badge>
                    {reservation.isNewDesignation && (
                      <Badge className="bg-blue-100 text-blue-800">新指名</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  チャット
                </Button>
                <Button variant="outline">
                  <Pencil className="w-4 h-4 mr-2" />
                  編集
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* 左カラム - 予約基本情報 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 予約情報 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  予約情報
                  <Button variant="ghost" size="sm">
                    <Pencil className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">予約日時</label>
                    <p className="mt-1">{reservation.startTime.toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short'
                    })}</p>
                    <p className="text-sm text-gray-600">
                      {reservation.startTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} - 
                      {reservation.endTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">所要時間</label>
                    <p className="mt-1">{reservation.duration}分</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">担当キャスト</label>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-medium">{reservation.staffName}</span>
                    <Badge variant="secondary">{reservation.staffRank}</Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">コース</label>
                  <p className="mt-1">{reservation.courseName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">場所</label>
                  <p className="mt-1">{reservation.location}</p>
                </div>
                {reservation.notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">備考</label>
                    <p className="mt-1 text-sm bg-gray-50 p-3 rounded">{reservation.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 費用明細 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  費用明細
                  <Button variant="ghost" size="sm">
                    <Pencil className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">基本料金</div>
                      <div className="text-sm text-gray-500">{reservation.courseName}</div>
                    </div>
                    <div className="font-medium">¥{reservation.price.toLocaleString()}</div>
                  </div>
                  
                  {reservation.isNewDesignation && (
                    <>
                      <Separator />
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">指名料</div>
                          <div className="text-sm text-gray-500">新規指名</div>
                        </div>
                        <div className="font-medium">¥3,000</div>
                      </div>
                    </>
                  )}
                  
                  <Separator />
                  <div className="flex justify-between items-center pt-2 border-t-2 border-emerald-600">
                    <span className="text-lg font-bold">合計金額</span>
                    <span className="text-xl font-bold text-emerald-600">
                      ¥{(reservation.price + (reservation.isNewDesignation ? 3000 : 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* タブコンテンツ */}
            <Card>
              <CardContent className="p-0">
                <Tabs defaultValue="notes" className="w-full">
                  <div className="border-b">
                    <TabsList className="grid w-full grid-cols-2 bg-transparent">
                      <TabsTrigger value="notes" className="border-b-2 border-transparent data-[state=active]:border-emerald-600">
                        連絡事項・メモ
                      </TabsTrigger>
                      <TabsTrigger value="history" className="relative border-b-2 border-transparent data-[state=active]:border-emerald-600">
                        修正履歴
                        {modificationAlerts.length > 0 && (
                          <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
                            {modificationAlerts.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <TabsContent value="notes" className="p-6 space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">お客様からの連絡事項</h4>
                      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                        <p>連絡希望時間：指定なし</p>
                        <p>ご要望：電話はタイミング的に出れない場合（出れなかった場合は折り返します）</p>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium">店舗記入メモ</h4>
                        <Button variant="ghost" size="sm">
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded min-h-[80px]">
                        メモなし
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="history" className="p-6">
                    <ModificationHistoryTable 
                      modifications={modificationHistory}
                      alerts={modificationAlerts}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* 右カラム - アクション・履歴 */}
          <div className="space-y-6">
            {/* ステータス変更 */}
            <Card>
              <CardHeader>
                <CardTitle>ステータス変更</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant={reservation.status === 'pending' ? 'default' : 'outline'} className="w-full">
                  仮予約
                </Button>
                <Button variant={reservation.status === 'confirmed' ? 'default' : 'outline'} className="w-full">
                  確定
                </Button>
                <Button variant="outline" className="w-full">事前確認</Button>
                <Button variant="outline" className="w-full">完了</Button>
                <Button variant="destructive" className="w-full">キャンセル</Button>
              </CardContent>
            </Card>

            {/* クイックアクション */}
            <Card>
              <CardHeader>
                <CardTitle>予約操作</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Clock className="w-4 h-4 mr-2" />
                  時間変更
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  キャスト変更
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  延長
                </Button>
              </CardContent>
            </Card>

            {/* 利用履歴 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  利用履歴
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-green-100 text-green-800">確定</Badge>
                      <span className="text-sm font-medium">2023/12/25(月)</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>10:30-13:30</p>
                      <p>担当：みるく</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-green-100 text-green-800">完了</Badge>
                      <span className="text-sm font-medium">2023/12/18(月)</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>14:00-16:00</p>
                      <p>担当：さくら</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 修正可能状態の通知 */}
            {reservation.status === 'modifiable' && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-800">修正可能状態</p>
                      <p className="text-xs text-orange-600">30分間オーダーの修正が可能です</p>
                    </div>
                    <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">
                      修正
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}