'use client'

import { useState, useEffect } from 'react'
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BarChart, Users, Calendar, DollarSign, MessageSquare, UserCheck, UserPlus, Clock } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ReservationList } from "@/components/reservation/reservation-list"
import { getAllReservations } from "@/lib/reservation/data"
import Link from "next/link"
import { format } from "date-fns"
import { Reservation } from "@/lib/types/reservation"
import { ReservationDialog } from '@/components/reservation/reservation-dialog';
import { ReservationData } from '@/lib/types/reservation';
import { recordModification } from '@/lib/modification-history/data';

export default function HomePage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  // 予約データをダイアログ用に変換
  const convertToReservationData = (reservation: Reservation): ReservationData | null => {
    if (!reservation) return null;
    
    return {
      id: reservation.id,
      customerId: reservation.customerId,
      customerName: `顧客${reservation.customerId}`, // 実際のデータから取得
      customerType: "通常顧客",
      phoneNumber: "090-1234-5678", // 実際のデータから取得
      points: 100,
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
      course: "リラクゼーションコース",
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

  const handleMakeModifiable = (reservationId: string) => {
    const reservation = reservations.find(r => r.id === reservationId);
    if (!reservation) return;

    // 修正履歴を記録
    recordModification(
      reservationId,
      "user_current", // 実際のアプリではログインユーザーIDを使用
      "現在のユーザー", // 実際のアプリではログインユーザー名を使用
      "status",
      "ステータス",
      reservation.status,
      "modifiable",
      "確定済み予約を修正可能状態に変更",
      "192.168.1.100", // 実際のアプリでは実際のIPを取得
      navigator.userAgent,
      "current_session"
    );

    setReservations(prev => 
      prev.map(reservation => 
        reservation.id === reservationId 
          ? { 
              ...reservation, 
              status: 'modifiable' as const,
              modifiableUntil: new Date(Date.now() + 30 * 60 * 1000), // 30分後まで修正可能
              lastModified: new Date()
            }
          : reservation
      )
    );
  };

  useEffect(() => {
    const fetchReservations = async () => {
      const fetchedReservations = await getAllReservations();
      setReservations(fetchedReservations);
    };

    fetchReservations();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">ダッシュボード</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                会員数
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">9,179</div>
              <p className="text-xs text-muted-foreground">
                前月比 +2.1%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                本日ログイン
              </CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">46</div>
              <p className="text-xs text-muted-foreground">
                前日比 -5
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                本日登録
              </CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">7</div>
              <p className="text-xs text-muted-foreground">
                前日比 +2
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                本日メッセージ
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                前日比 ±0
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">売上データ</CardTitle>
              <CardDescription>2024-12-10(火) 現在</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">月次比較</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">平均本数</div>
                      <div className="flex items-baseline gap-2">
                        <div>
                          <span className="text-sm text-muted-foreground">先月: </span>
                          <span>13</span>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">今月: </span>
                          <span className="text-red-500">12↓</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">平均出勤</div>
                      <div className="flex items-baseline gap-2">
                        <div>
                          <span className="text-sm text-muted-foreground">先月: </span>
                          <span>11</span>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">今月: </span>
                          <span>11</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">回転率</div>
                      <div className="flex items-baseline gap-2">
                        <div>
                          <span className="text-sm text-muted-foreground">先月: </span>
                          <span>1.24</span>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">今月: </span>
                          <span className="text-red-500">1.13↓</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">年次比較</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">平均本数</div>
                      <div className="flex items-baseline gap-2">
                        <div>
                          <span className="text-sm text-muted-foreground">前年: </span>
                          <span>17</span>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">今月: </span>
                          <span className="text-red-500">12↓</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">平均出勤</div>
                      <div className="flex items-baseline gap-2">
                        <div>
                          <span className="text-sm text-muted-foreground">前年: </span>
                          <span>10</span>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">今月: </span>
                          <span className="text-yellow-500">11↑</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">回転率</div>
                      <div className="flex items-baseline gap-2">
                        <div>
                          <span className="text-sm text-muted-foreground">前年: </span>
                          <span>1.64</span>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">今月: </span>
                          <span className="text-red-500">1.13↓</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">オーダー状況</CardTitle>
          </CardHeader>
          <CardContent>
            <ReservationList 
              reservations={reservations} 
              limit={5} 
              showViewMore={true} 
              onOpenReservation={setSelectedReservation}
              onMakeModifiable={handleMakeModifiable}
            />
          </CardContent>
        </Card>

        <ReservationDialog
          open={!!selectedReservation}
          onOpenChange={(open) => !open && setSelectedReservation(null)}
          reservation={selectedReservation ? convertToReservationData(selectedReservation) : null}
        />
      </main>
    </div>
  )
}
