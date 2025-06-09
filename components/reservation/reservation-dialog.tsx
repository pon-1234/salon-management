"use client"

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pencil, MessageSquare, Clock, Users, ArrowRight, MoreHorizontal, Phone } from 'lucide-react'
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ModificationHistoryTable } from "@/components/reservation/modification-history-table"
import { getModificationHistory, getModificationAlerts } from "@/lib/modification-history/data"
import { ReservationData } from "@/lib/types/reservation";

interface ReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // 1. Fix: Updated reservation type to ReservationData
  reservation: ReservationData | null | undefined;
}

export function ReservationDialog({
  open,
  onOpenChange,
  reservation
}: ReservationDialogProps) {
  if (!reservation) return null

  const modificationHistory = getModificationHistory(reservation.id)
  const modificationAlerts = getModificationAlerts(reservation.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden flex flex-col [&>button]:z-50 [&>button]:top-4 [&>button]:right-4 [&>button]:bg-white [&>button]:shadow-lg [&>button]:hover:bg-gray-50 [&>button]:border [&>button]:border-gray-200">
        <DialogTitle className="sr-only">
          予約情報 - {reservation?.customerName}
        </DialogTitle>
        <DialogDescription className="sr-only">
          このダイアログは {reservation?.customerName} 様の予約詳細を表示します。
        </DialogDescription>

        {/* ヘッダー */}
        <div className="bg-emerald-600 p-6 text-white sticky top-0 z-10">
          <div className="flex justify-between items-start pr-12">
            <div>
              <h2 className="text-2xl font-bold">{reservation?.customerName} 様</h2>
              <div className="flex gap-2 mt-2">
                <Badge className="bg-white text-black border-none inline-flex items-center gap-1 px-2 hover:bg-gray-100">
                  <Phone className="w-4 h-4 text-black" />
                  <span className="text-sm">{reservation?.phoneNumber}</span>
                </Badge>
              </div>
            </div>
            <div className="flex items-center">
              <Button className="bg-white text-emerald-600 hover:bg-gray-100">
                <MessageSquare className="w-4 h-4 mr-2" />
                この顧客に「チャットする」
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">予約詳細</TabsTrigger>
                <TabsTrigger value="history" className="relative">
                  修正履歴
                  {modificationAlerts.length > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
                      {modificationAlerts.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            
            <TabsContent value="details" className="space-y-6 mt-6">
          {/* 店舗名・キャスト氏名行 */}
          <div className="flex items-center gap-2">
            <div className="text-gray-600">
              店舗名 / {reservation?.staff ?? "キャスト未定"}
            </div>
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
              通常顧客
            </Badge>
            <Badge variant="destructive">NG顧客</Badge>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* 左カラム */}
            <div className="space-y-4">
              {/* お客様からの連絡事項 */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold">お客様からの連絡事項</h3>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>連絡希望時間：指定なし</p>
                  <p>ご要望：電話はタイミング的に出れない場合（出れなかった場合は折り返します）</p>
                  <p>連絡手段：{reservation?.phoneNumber ? "電話" : ""} / メール / LINE</p>
                  <p>アレルギー・注意事項：特になし</p>
                </div>
              </div>

              {/* 店舗記入メモ */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold">店舗記入メモ</h3>
                  <Button variant="ghost" size="icon" className="text-emerald-600">
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* 利用履歴 */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold">利用履歴</h3>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-[auto_1fr] gap-4 items-center">
                    <Badge className="bg-gray-200 text-gray-700 hover:bg-gray-300">確定</Badge>
                    <div>
                      <div>2023/12/25(月)</div>
                      <div className="text-sm text-gray-500">10:30-13:30</div>
                    </div>
                    <div className="col-span-2">キャストの氏名</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 右カラム */}
            <div className="space-y-4">
              {/* 日時 */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold">日時</h3>
                  <Button variant="ghost" size="icon" className="text-emerald-600">
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">ご予約日時</span>
                    <span>{reservation?.date} {reservation?.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">受付日時</span>
                    <span>{reservation?.time}</span>
                  </div>
                </div>
              </div>

              {/* 場所情報 */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold">場所情報</h3>
                  <Button variant="ghost" size="icon" className="text-emerald-600">
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">場所</span>
                    <span>-</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">サービス場所</span>
                    <span>アパホテル</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">エリア</span>
                    <span>-</span>
                  </div>
                </div>
              </div>

              {/* 費用明細 */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold">費用明細</h3>
                  <Button variant="ghost" size="icon" className="text-emerald-600">
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium">キャスト</div>
                      <div className="text-sm text-gray-500">{reservation?.staff}</div>
                    </div>
                    <div className="font-medium">指名料 3,000円</div>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium">コース</div>
                      <div className="text-sm text-gray-500">イベントコース（税込）130分</div>
                    </div>
                    <div className="font-medium">10,000円</div>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium">オプション</div>
                      <div className="text-sm text-gray-500">ネックトリートメント</div>
                    </div>
                    <div className="font-medium">1,000円</div>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium">オプション</div>
                      <div className="text-sm text-gray-500">ホットストーン</div>
                    </div>
                    <div className="font-medium">2,000円</div>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium">延長</div>
                      <div className="text-sm text-gray-500">無し</div>
                    </div>
                    <div className="font-medium">0円</div>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium">交通費</div>
                      <div className="text-sm text-gray-500">東京駅</div>
                    </div>
                    <div className="font-medium">0円</div>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium">料金調整</div>
                      <div className="text-sm text-gray-500">調整コメント</div>
                    </div>
                    <div className="font-medium">0円</div>
                  </div>
                  <div className="mt-4 border-2 border-emerald-600 rounded p-3 flex justify-between items-center">
                    <span className="font-bold">総額</span>
                    <span className="text-xl font-bold text-emerald-600">16,000円</span>
                  </div>
                </div>
              </div>

              {/* 支払い状況 */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold">支払い状況</h3>
                  <Button variant="ghost" size="icon" className="text-emerald-600">
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">支払い方法</span>
                    <span>{reservation?.paymentMethod || "現金"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">支払い状況</span>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">未払い</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">領収書</span>
                    <span className="text-blue-600 cursor-pointer hover:underline">発行済み</span>
                  </div>
                </div>
              </div>

              {/* 確認状況 */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold">確認状況</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">キャスト確認</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-700">確認済み</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">顧客確認</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-700">確認済み</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">最終確認日時</span>
                    <span className="text-sm">2023/12/20 14:30</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ステータスボタン */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1">仮予約</Button>
            <Button variant="outline" className="flex-1">事前確認</Button>
            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">確定</Button>
            <Button variant="outline" className="flex-1">完了</Button>
            <Button variant="outline" className="flex-1 text-red-600 hover:text-red-700">キャンセル</Button>
          </div>
          
          {/* 修正可能状態でのオーダー修正ボタン */}
          {reservation?.bookingStatus === 'modifiable' && (
            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-800">修正可能状態</p>
                  <p className="text-xs text-orange-600">30分間オーダーの修正が可能です</p>
                </div>
                <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                  オーダー修正
                </Button>
              </div>
            </div>
          )}
            </TabsContent>
            
            <TabsContent value="history" className="mt-6">
              <ModificationHistoryTable 
                modifications={modificationHistory}
                alerts={modificationAlerts}
              />
            </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* 下部アクション */}
        <div className="grid grid-cols-3 border-t shrink-0">
          <Button variant="ghost" className="flex items-center justify-center gap-2 p-6 hover:bg-gray-50">
            <Clock className="w-4 h-4" />
            予約時間の変更
          </Button>
          <Button variant="ghost" className="flex items-center justify-center gap-2 p-6 hover:bg-gray-50 border-l border-r">
            <Users className="w-4 h-4" />
            キャストの変更
          </Button>
          <Button variant="ghost" className="flex items-center justify-center gap-2 p-6 hover:bg-gray-50">
            <ArrowRight className="w-4 h-4" />
            予約の延長
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
