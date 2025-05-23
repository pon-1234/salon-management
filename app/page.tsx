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
import { Reservation } from "@/lib/types/reservation"
import { ReservationDialog } from '@/components/reservation/reservation-dialog';

export default function HomePage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

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
          <div className="flex items-center gap-4">
            <Select defaultValue="2024">
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024年</SelectItem>
                <SelectItem value="2023">2023年</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input 
                placeholder="オーダーNo" 
                className="w-[200px]"
              />
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                オーダー修正
              </Button>
            </div>
          </div>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
            <ReservationList reservations={reservations} limit={3} showViewMore={true} onOpenReservation={setSelectedReservation} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {/* 営業関連 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">営業関連</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm">
                <div className="font-medium mb-2">＜店舗合計＞</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>1位：2023-07-01（土）39本</div>
                    <div className="text-emerald-600">￥518,225</div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>1位：2023-11-24（金）39本</div>
                    <div className="text-emerald-600">￥464,550</div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>1位：2024-06-15（土）39本</div>
                    <div className="text-emerald-600">￥433,675</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 女性関連 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">女性関連</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm">
                <div className="mb-2">オフィシャル写メ日記送信先は以下です。</div>
                <div className="space-y-1">
                  <div>金：syame-ike@gold-esthe.com</div>
                  <div>ポ：syame-ike@bollinger-m.com</div>
                </div>
                <div className="mt-4 space-y-1">
                  <div>■店番号：5600</div>
                  <div>金の玉クラブ：5600</div>
                  <div>ポランジェ：5500</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <ReservationDialog
          open={!!selectedReservation}
          onOpenChange={(open) => !open && setSelectedReservation(null)}
          reservation={selectedReservation}
        />
      </main>
    </div>
  )
}
