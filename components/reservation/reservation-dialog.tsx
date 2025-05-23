"use client"

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pencil, MessageSquare, Clock, Users, ArrowRight, MoreHorizontal, Phone, Mail } from 'lucide-react'
import { Separator } from "@/components/ui/separator"
// 4. Fix: Ensure consistent ReservationData type
import { ReservationData } from "@/components/reservation/reservation-table";

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-y-auto max-h-[90vh]">
        <DialogTitle className="sr-only">
          予約情報 - {reservation?.customerName}
        </DialogTitle>
        <DialogDescription className="sr-only">
          このダイアログは {reservation?.customerName} 様の予約詳細を表示します。
        </DialogDescription>

        {/* ヘッダー */}
        <div className="bg-emerald-600 p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">{reservation?.customerName} 様</h2>
              <div className="flex gap-2 mt-2">
                <Badge className="bg-white text-black border-none inline-flex items-center gap-1 px-2">
                  <Phone className="w-4 h-4 text-black" />
                  <span className="text-sm">{reservation?.phoneNumber}</span>
                </Badge>
                <Badge className="bg-white text-black border-none inline-flex items-center gap-1 px-2">
                  <Mail className="w-4 h-4 text-black" />
                  <span className="text-sm">{reservation?.email}</span>
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button className="bg-white text-emerald-600 hover:bg-gray-100">
                <MessageSquare className="w-4 h-4 mr-2" />
                この顧客に「チャットする」
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* 店舗名・マッサージ師氏名行 */}
          <div className="flex items-center gap-2">
            <div className="text-gray-600">
              店舗名 / {reservation?.staff ?? "マッサージ師未定"}
            </div>
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
              通常顧客
            </Badge>
            <Badge variant="destructive">NG顧客</Badge>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* 左カラム */}
            <div className="space-y-6">
              {/* お客様からの連絡事項 */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold">お客様からの連絡事項</h3>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>連絡希望時間：指定なし</p>
                  <p>ご要望：電話はタイミング的に出れない場合（出れなかった場合は折り返します）</p>
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
                    <div className="col-span-2">マッサージ師の氏名</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 右カラム */}
            <div className="space-y-6">
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
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <div>
                      <div>マッサージ師</div>
                      <div className="text-sm text-gray-500">{reservation?.staff}</div>
                    </div>
                    <div>指名料 3,000円</div>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <div>
                      <div>コース</div>
                      <div className="text-sm text-gray-500">イベントコース（税込）130分</div>
                    </div>
                    <div>10,000円</div>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <div>
                      <div>オプション</div>
                      <div className="text-sm text-gray-500">ネックトリートメント</div>
                    </div>
                    <div>1,000円</div>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <div>
                      <div>オプション</div>
                      <div className="text-sm text-gray-500">ホットストーン</div>
                    </div>
                    <div>2,000円</div>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <div>
                      <div>延長</div>
                      <div className="text-sm text-gray-500">無し</div>
                    </div>
                    <div>0円</div>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <div>
                      <div>交通費</div>
                      <div className="text-sm text-gray-500">東京駅</div>
                    </div>
                    <div>0円</div>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <div>
                      <div>料金調整</div>
                      <div className="text-sm text-gray-500">調整コメント</div>
                    </div>
                    <div>0円</div>
                  </div>
                  <div className="mt-4 border-2 border-emerald-600 rounded p-3 flex justify-between items-center">
                    <span className="font-bold">総額</span>
                    <span className="text-2xl font-bold text-emerald-600">16,000円</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ステータスボタン */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1">仮予約</Button>
            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">確定</Button>
            <Button variant="outline" className="flex-1">事前確認</Button>
            <Button variant="outline" className="flex-1">完了</Button>
            <Button variant="outline" className="flex-1 text-red-600 hover:text-red-700">キャンセル</Button>
          </div>
        </div>

        {/* 下部アクション */}
        <div className="grid grid-cols-3 border-t">
          <Button variant="ghost" className="flex items-center justify-center gap-2 p-6 hover:bg-gray-50">
            <Clock className="w-4 h-4" />
            予約時間の変更
          </Button>
          <Button variant="ghost" className="flex items-center justify-center gap-2 p-6 hover:bg-gray-50 border-l border-r">
            <Users className="w-4 h-4" />
            マッサージ師の変更
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
