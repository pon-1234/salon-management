'use client'

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ModificationHistoryTable } from '@/components/reservation/modification-history-table'
import { getModificationHistory, getModificationAlerts } from '@/lib/modification-history/data'
import { ReservationData } from '@/lib/types/reservation'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface ReservationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reservation: ReservationData | null | undefined
  onSave?: (data: Partial<ReservationData>) => void
}

export function ReservationDialog({
  open,
  onOpenChange,
  reservation,
  onSave,
}: ReservationDialogProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [isEditMode, setIsEditMode] = useState(false)
  const [formData, setFormData] = useState<Partial<ReservationData>>({})
  const [statusChangeDialog, setStatusChangeDialog] = useState<{
    open: boolean
    newStatus: string
  }>({ open: false, newStatus: '' })
  const [modifyDialog, setModifyDialog] = useState(false)
  const [remainingTime, setRemainingTime] = useState<number | null>(null)

  const modificationHistory = reservation ? getModificationHistory(reservation.id) : []
  const modificationAlerts = reservation ? getModificationAlerts(reservation.id) : []

  // Initialize form data when entering edit mode
  useEffect(() => {
    if (isEditMode && reservation) {
      setFormData({
        date: reservation.date,
        time: reservation.time,
        staff: reservation.staff,
        course: reservation.course,
        location: reservation.location,
        options: reservation.options,
        bookingStatus: reservation.bookingStatus,
      })
    }
  }, [isEditMode, reservation])

  // Handle modifiable timer
  useEffect(() => {
    if (reservation?.bookingStatus === 'modifiable' && reservation.modifiableUntil) {
      const updateTimer = () => {
        const now = new Date().getTime()
        const until = new Date(reservation.modifiableUntil!).getTime()
        const diff = until - now

        if (diff <= 0) {
          // Timer expired, revert to confirmed
          if (onSave) {
            onSave({ bookingStatus: 'confirmed' })
          }
          setRemainingTime(null)
        } else {
          setRemainingTime(Math.floor(diff / 1000))
        }
      }

      updateTimer()
      const interval = setInterval(updateTimer, 1000)

      return () => clearInterval(interval)
    } else {
      setRemainingTime(null)
    }
  }, [reservation?.bookingStatus, reservation?.modifiableUntil, onSave])

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

  const formatRemainingTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  if (!reservation) return null

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
                    onClick={() => {
                      if (onSave) {
                        onSave(formData)
                      }
                      setIsEditMode(false)
                    }}
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
                      {isEditMode ? (
                        <div className="space-y-2">
                          <div>
                            <Label htmlFor="date" className="text-xs">
                              予約日
                            </Label>
                            <Input
                              id="date"
                              type="date"
                              value={formData.date || ''}
                              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                              className="mt-1 h-8"
                            />
                          </div>
                          <div>
                            <Label htmlFor="start-time" className="text-xs">
                              開始時間
                            </Label>
                            <Input
                              id="start-time"
                              type="time"
                              value={formData.time || ''}
                              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                              className="mt-1 h-8"
                            />
                          </div>
                          <div>
                            <Label htmlFor="end-time" className="text-xs">
                              終了時間
                            </Label>
                            <Input
                              id="end-time"
                              type="time"
                              value={
                                formData.endTime instanceof Date
                                  ? formData.endTime.toISOString().slice(11, 16)
                                  : formData.endTime || ''
                              }
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  endTime: new Date(`2000-01-01T${e.target.value}:00`),
                                })
                              }
                              className="mt-1 h-8"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="font-medium">
                            {reservation?.date} {reservation?.time}
                          </p>
                          <p className="text-sm text-gray-500">130分コース</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 場所カード */}
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 text-gray-600" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">場所</p>
                      {isEditMode ? (
                        <div>
                          <Label htmlFor="location" className="text-xs">
                            場所
                          </Label>
                          <Select
                            value={formData.location || ''}
                            onValueChange={(value) => setFormData({ ...formData, location: value })}
                          >
                            <SelectTrigger id="location" className="mt-1 h-8">
                              <SelectValue placeholder="場所を選択" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="アパホテル">アパホテル</SelectItem>
                              <SelectItem value="東横イン">東横イン</SelectItem>
                              <SelectItem value="ルートイン">ルートイン</SelectItem>
                              <SelectItem value="その他">その他</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <>
                          <p className="font-medium">{reservation?.location || 'アパホテル'}</p>
                          <p className="text-sm text-gray-500">東京エリア</p>
                        </>
                      )}
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
                {isEditMode ? (
                  <div>
                    <Label htmlFor="cast" className="text-sm">
                      キャスト
                    </Label>
                    <Select
                      value={formData.staff || ''}
                      onValueChange={(value) => setFormData({ ...formData, staff: value })}
                    >
                      <SelectTrigger id="cast" className="mt-1">
                        <SelectValue placeholder="キャストを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="山田花子">山田花子</SelectItem>
                        <SelectItem value="佐藤太郎">佐藤太郎</SelectItem>
                        <SelectItem value="鈴木美恵">鈴木美恵</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-gray-200" />
                    <div>
                      <p className="font-medium">{reservation?.staff || 'キャスト未定'}</p>
                      <p className="text-sm text-gray-600">指名料: ¥3,000</p>
                    </div>
                  </div>
                )}
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
                    {isEditMode ? (
                      <div className="mt-1">
                        <Label htmlFor="course" className="text-xs">
                          コース
                        </Label>
                        <Select
                          value={formData.course || ''}
                          onValueChange={(value) => setFormData({ ...formData, course: value })}
                        >
                          <SelectTrigger id="course" className="mt-1">
                            <SelectValue placeholder="コースを選択" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="スタンダードコース">スタンダードコース</SelectItem>
                            <SelectItem value="イベントコース（税込）130分">
                              イベントコース（税込）130分
                            </SelectItem>
                            <SelectItem value="プレミアムコース">プレミアムコース</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <p className="font-medium">
                        {reservation?.course || 'イベントコース（税込）130分'}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-gray-600">オプション</p>
                    {isEditMode ? (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="neck-treatment"
                            checked={formData.options?.['ネックトリートメント'] || false}
                            onCheckedChange={(checked) =>
                              setFormData({
                                ...formData,
                                options: {
                                  ...formData.options,
                                  ['ネックトリートメント']: checked as boolean,
                                },
                              })
                            }
                          />
                          <Label htmlFor="neck-treatment" className="text-sm font-normal">
                            ネックトリートメント
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="hot-stone"
                            checked={formData.options?.['ホットストーン'] || false}
                            onCheckedChange={(checked) =>
                              setFormData({
                                ...formData,
                                options: {
                                  ...formData.options,
                                  ['ホットストーン']: checked as boolean,
                                },
                              })
                            }
                          />
                          <Label htmlFor="hot-stone" className="text-sm font-normal">
                            ホットストーン
                          </Label>
                        </div>
                      </div>
                    ) : (
                      <ul className="mt-1 space-y-1">
                        {Object.entries(reservation?.options || {})
                          .filter(([_, value]) => value)
                          .map(([key]) => (
                            <li key={key} className="font-medium">
                              • {key}
                            </li>
                          ))}
                      </ul>
                    )}
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
                      <p className="mt-1 text-xs text-orange-600">修正可能な時間が限られています</p>
                      {remainingTime !== null && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-sm font-medium text-orange-700">残り時間:</span>
                          <span className="rounded bg-orange-100 px-2 py-1 font-mono text-sm font-medium text-orange-800">
                            {formatRemainingTime(remainingTime)}
                          </span>
                        </div>
                      )}
                      <Button
                        size="sm"
                        className="mt-3 bg-orange-600 hover:bg-orange-700"
                        onClick={() => setIsEditMode(true)}
                      >
                        オーダー修正
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* 確定済み予約の修正ボタン */}
              {reservation?.bookingStatus === 'confirmed' && !isEditMode && (
                <div className="rounded-lg border bg-white p-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setModifyDialog(true)}
                  >
                    予約修正
                  </Button>
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
                variant={formData.bookingStatus === 'tentative' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setStatusChangeDialog({ open: true, newStatus: 'tentative' })}
              >
                仮予約
              </Button>
              <Button
                variant={formData.bookingStatus === 'confirmed' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setStatusChangeDialog({ open: true, newStatus: 'confirmed' })}
              >
                確定
              </Button>
              <Button
                variant={formData.bookingStatus === 'completed' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setStatusChangeDialog({ open: true, newStatus: 'completed' })}
              >
                完了
              </Button>
              <Button
                variant={formData.bookingStatus === 'cancelled' ? 'destructive' : 'outline'}
                size="sm"
                className="flex-1 text-red-600 hover:text-red-700"
                onClick={() => setStatusChangeDialog({ open: true, newStatus: 'cancelled' })}
              >
                キャンセル
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      {/* ステータス変更確認ダイアログ */}
      <AlertDialog
        open={statusChangeDialog.open}
        onOpenChange={(open) => setStatusChangeDialog({ ...statusChangeDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ステータス変更の確認</AlertDialogTitle>
            <AlertDialogDescription>
              ステータスを「{getStatusText(statusChangeDialog.newStatus)}」に変更しますか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setFormData({ ...formData, bookingStatus: statusChangeDialog.newStatus })
                setStatusChangeDialog({ open: false, newStatus: '' })
              }}
            >
              変更する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 予約修正確認ダイアログ */}
      <AlertDialog open={modifyDialog} onOpenChange={setModifyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>予約修正の確認</AlertDialogTitle>
            <AlertDialogDescription>
              予約を修正可能状態にしますか？修正可能な時間は30分間に制限されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (onSave) {
                  const modifiableUntil = new Date()
                  modifiableUntil.setMinutes(modifiableUntil.getMinutes() + 30)
                  onSave({
                    bookingStatus: 'modifiable',
                    modifiableUntil,
                  })
                }
                setModifyDialog(false)
              }}
            >
              修正可能にする
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
