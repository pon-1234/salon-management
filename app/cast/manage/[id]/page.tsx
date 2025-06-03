"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { StaffForm } from "@/components/cast/cast-form"
import { Cast } from "@/lib/cast/types"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Clock, CalendarDays } from 'lucide-react'
import { getAllCasts } from "@/lib/cast/data"
import { ScheduleEditDialog } from "@/components/cast/schedule-edit-dialog"

export default function CastManagePage({ params }: { params: { id: string } }) {
  const [cast, setCast] = useState<Cast | null>(null)
  const router = useRouter()
  const isNewCast = params.id === "new"

  useEffect(() => {
    const fetchCast = async () => {
      const castList = getAllCasts()
      const foundCast = castList.find(c => c.id === params.id)
      setCast(foundCast || null);
    }

    fetchCast()
  }, [params.id, isNewCast])

  const handleSubmit = async (data: Partial<Cast>) => {
    // In a real application, this would make an API call
    console.log("Submitting cast data:", data)
    router.push("/cast/list")
  }

  if (!isNewCast && !cast) {
    return <div>Loading...</div>
  }


  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            {isNewCast ? "新規キャスト登録" : "キャスト情報編集"}
          </h1>
          <Button
            variant="ghost"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            戻る
          </Button>
        </div>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 出勤情報と予約情報 */}
          {!isNewCast && cast && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 出勤情報 */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      出勤情報
                    </CardTitle>
                    <ScheduleEditDialog 
                      castName={cast?.name || "キャスト"}
                      onSave={(schedule) => {
                        console.log("スケジュール更新:", schedule)
                        // 実際のアプリではAPI呼び出しを行う
                      }}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>03(火)</span>
                      <span>20:00-29:00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>04(水)</span>
                      <span>13:00-23:30</span>
                    </div>
                    <div className="flex justify-between">
                      <span>05(木)</span>
                      <span>15:00-29:00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>06(金)</span>
                      <span>13:00-29:00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>07(土)</span>
                      <span>13:00-23:30</span>
                    </div>
                    <div className="flex justify-between">
                      <span>08(日)</span>
                      <span className="text-gray-500">休日</span>
                    </div>
                    <div className="flex justify-between">
                      <span>09(月)</span>
                      <span className="text-gray-500">未定</span>
                    </div>
                    <div className="mt-3 pt-3 border-t text-xs text-gray-600">
                      ※実出勤（22:00〜5:00）
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 予約情報 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5" />
                    予約情報
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border rounded-lg p-3 bg-blue-50">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">事前予約</Badge>
                        <span className="font-medium">タナカ 様</span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>2025-06-06日 17時30分</div>
                        <div>イベント110分 <Badge variant="outline">おすすめ指名</Badge></div>
                        <div className="font-medium">15,000円</div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="destructive" className="text-xs">メール未送信</Badge>
                        <Badge variant="destructive" className="text-xs">女性未確認</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* キャスト情報フォーム */}
          <StaffForm
            staff={cast}
            onSubmit={handleSubmit}
          />
        </div>
      </main>
    </div>
  )
}
