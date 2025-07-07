'use client'

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Edit,
  MessageSquare,
  X,
  Check,
  AlertCircle,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ModificationHistoryTable } from '@/components/reservation/modification-history-table'
import { getModificationHistory, getModificationAlerts } from '@/lib/modification-history/data'
import { ReservationData } from '@/lib/types/reservation'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface ReservationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reservation: ReservationData | null | undefined
}

export function ReservationDialog({ open, onOpenChange, reservation }: ReservationDialogProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [isEditMode, setIsEditMode] = useState(false)

  if (!reservation) return null

  const modificationHistory = getModificationHistory(reservation.id)
  const modificationAlerts = getModificationAlerts(reservation.id)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500'
      case 'modifiable':
        return 'bg-orange-500'
      case 'tentative':
        return 'bg-blue-500'
      case 'cancelled':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '確定'
      case 'modifiable':
        return '修正可能'
      case 'tentative':
        return '仮予約'
      case 'cancelled':
        return 'キャンセル'
      default:
        return status
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden p-0">
        <DialogTitle className="sr-only">予約情報 - {reservation?.customerName}</DialogTitle>
        <DialogDescription className="sr-only">
          このダイアログは {reservation?.customerName} 様の予約詳細を表示します。
        </DialogDescription>

        {/* ヘッダー */}
        <div className="sticky top-0 z-10 border-b bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'h-3 w-3 rounded-full',
                  getStatusColor(reservation?.bookingStatus || 'confirmed')
                )}
              />
              <h2 className="text-xl font-semibold">{reservation?.customerName} 様</h2>
              <Badge variant="outline" className="text-xs">
                {getStatusText(reservation?.bookingStatus || 'confirmed')}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {!isEditMode ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setIsEditMode(true)}>
                    <Edit className="h-4 w-4" />
                    編集
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => setIsEditMode(false)}>
                    キャンセル
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => setIsEditMode(false)}
                  >
                    <Check className="h-4 w-4" />
                    保存
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-4 pb-0 pt-2">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">概要</TabsTrigger>
                <TabsTrigger value="details">詳細</TabsTrigger>
                <TabsTrigger value="history" className="relative">
                  履歴
                  {modificationAlerts.length > 0 && (
                    <Badge variant="destructive" className="ml-1 h-4 px-1.5 py-0 text-[10px]">
                      {modificationAlerts.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-4 p-4">
              {/* Quick Info Cards */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* 日時カード */}
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="mt-0.5 h-5 w-5 text-gray-600" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">予約日時</p>
                      <p className="font-medium">
                        {reservation?.date} {reservation?.time}
                      </p>
                      <p className="text-sm text-gray-500">130分コース</p>
                    </div>
                  </div>
                </div>

                {/* 場所カード */}
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 text-gray-600" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">場所</p>
                      <p className="font-medium">アパホテル</p>
                      <p className="text-sm text-gray-500">東京エリア</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 料金サマリー */}
              <div className="rounded-lg border bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-medium">
                    <CreditCard className="h-4 w-4" />
                    料金サマリー
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {reservation?.paymentMethod || '現金'}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">コース料金</span>
                    <span>¥10,000</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">指名料</span>
                    <span>¥3,000</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">オプション</span>
                    <span>¥3,000</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-medium">
                    <span>合計</span>
                    <span className="text-lg">¥16,000</span>
                  </div>
                </div>
              </div>

              {/* キャスト情報 */}
              <div className="rounded-lg border bg-white p-4">
                <h3 className="mb-3 font-medium">担当キャスト</h3>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gray-200" />
                  <div>
                    <p className="font-medium">{reservation?.staff || 'キャスト未定'}</p>
                    <p className="text-sm text-gray-600">指名料: ¥3,000</p>
                  </div>
                </div>
              </div>

              {/* 連絡先 */}
              <div className="rounded-lg border bg-white p-4">
                <h3 className="mb-3 font-medium">連絡先</h3>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-600" />
                  <span className="text-sm">{reservation?.phoneNumber}</span>
                </div>
              </div>

              {/* アクションボタン */}
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" variant="outline">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  チャット
                </Button>
                <Button className="flex-1" variant="outline">
                  <Phone className="mr-2 h-4 w-4" />
                  電話
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4 p-4">
              {/* 顧客情報 */}
              <div className="rounded-lg border bg-white p-4">
                <h3 className="mb-3 font-medium">顧客情報</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      通常顧客
                    </Badge>
                    {/* NG顧客の場合は表示 */}
                  </div>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-gray-600">利用回数:</span> 3回目
                    </p>
                    <p>
                      <span className="text-gray-600">前回利用:</span> 2023/12/25
                    </p>
                  </div>
                </div>
              </div>

              {/* 予約詳細 */}
              <div className="rounded-lg border bg-white p-4">
                <h3 className="mb-3 font-medium">予約詳細</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-600">コース</p>
                    <p className="font-medium">イベントコース（税込）130分</p>
                  </div>
                  <div>
                    <p className="text-gray-600">オプション</p>
                    <ul className="mt-1 space-y-1">
                      <li className="font-medium">• ネックトリートメント</li>
                      <li className="font-medium">• ホットストーン</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* お客様からの連絡事項 */}
              <div className="rounded-lg border bg-white p-4">
                <h3 className="mb-3 font-medium">お客様からの連絡事項</h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-gray-600">連絡希望時間:</span> 指定なし
                  </p>
                  <p>
                    <span className="text-gray-600">ご要望:</span>{' '}
                    電話はタイミング的に出れない場合（出れなかった場合は折り返します）
                  </p>
                  <p>
                    <span className="text-gray-600">連絡手段:</span> 電話 / メール / LINE
                  </p>
                  <p>
                    <span className="text-gray-600">アレルギー・注意事項:</span> 特になし
                  </p>
                </div>
              </div>

              {/* 店舗メモ */}
              <div className="rounded-lg border bg-white p-4">
                <h3 className="mb-3 font-medium">店舗メモ</h3>
                <textarea
                  className="w-full resize-none rounded-md border p-2 text-sm"
                  rows={3}
                  placeholder="メモを入力..."
                  disabled={!isEditMode}
                />
              </div>

              {/* 料金詳細 */}
              <div className="rounded-lg border bg-white p-4">
                <h3 className="mb-3 font-medium">料金詳細</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>コース料金</span>
                    <span>¥10,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>指名料 ({reservation?.staff})</span>
                    <span>¥3,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ネックトリートメント</span>
                    <span>¥1,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ホットストーン</span>
                    <span>¥2,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>交通費</span>
                    <span>¥0</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-bold">
                    <span>合計</span>
                    <span>¥16,000</span>
                  </div>
                </div>
              </div>

              {/* 支払い・確認状況 */}
              <div className="rounded-lg border bg-white p-4">
                <h3 className="mb-3 font-medium">状況</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">支払い</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        現金
                      </Badge>
                      <Badge variant="secondary" className="bg-yellow-100 text-xs text-yellow-700">
                        未払い
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">キャスト確認</span>
                    <Badge variant="secondary" className="bg-green-100 text-xs text-green-700">
                      確認済み
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">顧客確認</span>
                    <Badge variant="secondary" className="bg-green-100 text-xs text-green-700">
                      確認済み
                    </Badge>
                  </div>
                </div>
              </div>

              {/* 修正可能状態の通知 */}
              {reservation?.bookingStatus === 'modifiable' && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 text-orange-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-orange-800">修正可能状態</p>
                      <p className="mt-1 text-xs text-orange-600">30分間オーダーの修正が可能です</p>
                      <Button size="sm" className="mt-2 bg-orange-600 hover:bg-orange-700">
                        オーダー修正
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="p-4">
              <ModificationHistoryTable
                modifications={modificationHistory}
                alerts={modificationAlerts}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* ステータス変更ボタン（編集モード時のみ） */}
        {isEditMode && (
          <div className="border-t bg-gray-50 p-4">
            <p className="mb-2 text-xs text-gray-600">ステータスを変更:</p>
            <div className="flex gap-2">
              <Button
                variant={reservation?.bookingStatus === 'tentative' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
              >
                仮予約
              </Button>
              <Button
                variant={reservation?.bookingStatus === 'confirmed' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
              >
                確定
              </Button>
              <Button
                variant={reservation?.bookingStatus === 'completed' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
              >
                完了
              </Button>
              <Button
                variant={reservation?.bookingStatus === 'cancelled' ? 'destructive' : 'outline'}
                size="sm"
                className="flex-1 text-red-600 hover:text-red-700"
              >
                キャンセル
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
