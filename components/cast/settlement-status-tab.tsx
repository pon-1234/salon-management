"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Calculator,
  Receipt,
  CreditCard
} from 'lucide-react'
import { SalesRecord, PaymentRecord, SettlementSummary } from "@/lib/cast/types"
import { 
  getSalesRecordsByCast, 
  getPaymentRecordsByCast, 
  getSettlementSummaryByCast 
} from "@/lib/cast/sales-data"
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"
import { ja } from "date-fns/locale"

interface SettlementStatusTabProps {
  castId: string
  castName: string
}

export function SettlementStatusTab({ castId, castName }: SettlementStatusTabProps) {
  const [salesRecords] = useState<SalesRecord[]>(getSalesRecordsByCast(castId))
  const [paymentRecords] = useState<PaymentRecord[]>(getPaymentRecordsByCast(castId))
  const [settlementSummary] = useState<SettlementSummary>(getSettlementSummaryByCast(castId))
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month" | "custom">("week")

  // 期間別の集計
  const getStatsByPeriod = (period: "week" | "month") => {
    const now = new Date()
    const start = period === "week" ? startOfWeek(now, { weekStartsOn: 1 }) : startOfMonth(now)
    const end = period === "week" ? endOfWeek(now, { weekStartsOn: 1 }) : endOfMonth(now)
    
    const periodSales = salesRecords.filter(record => 
      record.date >= start && record.date <= end
    )
    
    const periodPayments = paymentRecords.filter(record => 
      record.date >= start && record.date <= end
    )
    
    const totalSales = periodSales.reduce((sum, record) => sum + record.totalAmount, 0)
    const totalCastShare = periodSales.reduce((sum, record) => sum + record.castShare, 0)
    const totalPaid = periodPayments.reduce((sum, record) => sum + record.amount, 0)
    const unpaidSales = periodSales.filter(record => record.paymentStatus === "未精算")
    const unpaidAmount = unpaidSales.reduce((sum, record) => sum + record.castShare, 0)
    
    return {
      period: { start, end },
      totalSales,
      totalCastShare,
      totalPaid,
      unpaidAmount,
      unpaidCount: unpaidSales.length,
      paymentRate: totalCastShare > 0 ? (totalPaid / totalCastShare) * 100 : 0
    }
  }

  const weekStats = getStatsByPeriod("week")
  const monthStats = getStatsByPeriod("month")
  
  const unpaidSales = salesRecords.filter(record => record.paymentStatus === "未精算")
  const recentUnpaidSales = unpaidSales.filter(record => 
    record.date <= subDays(new Date(), 3) // 3日以上前の未精算
  )

  const settlementRate = settlementSummary.totalCastShare > 0 
    ? (settlementSummary.totalPaid / settlementSummary.totalCastShare) * 100 
    : 0

  return (
    <div className="space-y-6">
      {/* アラート */}
      {recentUnpaidSales.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800">
                  {recentUnpaidSales.length}件の古い未精算売上があります
                </p>
                <p className="text-sm text-orange-600">
                  3日以上前の売上で未精算のものがあります。確認してください。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 精算状況サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">総売上</p>
                <p className="text-xl font-bold">¥{settlementSummary.totalSales.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">取り分総額</p>
                <p className="text-xl font-bold">¥{settlementSummary.totalCastShare.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">支払済み</p>
                <p className="text-xl font-bold">¥{settlementSummary.totalPaid.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">未精算額</p>
                <p className="text-xl font-bold text-orange-600">¥{settlementSummary.pendingAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 精算率 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            精算進捗
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>精算率</span>
                <span>{settlementRate.toFixed(1)}%</span>
              </div>
              <Progress value={settlementRate} className="h-2" />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">支払済み:</span>
                <span className="font-medium ml-2">¥{settlementSummary.totalPaid.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-600">未精算:</span>
                <span className="font-medium ml-2 text-orange-600">¥{settlementSummary.pendingAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 期間別集計 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            期間別精算状況
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="week" className="space-y-4">
            <TabsList>
              <TabsTrigger value="week">今週</TabsTrigger>
              <TabsTrigger value="month">今月</TabsTrigger>
            </TabsList>
            
            <TabsContent value="week" className="space-y-4">
              <PeriodStatsCard 
                title="今週の精算状況"
                period={format(weekStats.period.start, "M/d", { locale: ja }) + " - " + format(weekStats.period.end, "M/d", { locale: ja })}
                stats={weekStats}
              />
            </TabsContent>
            
            <TabsContent value="month" className="space-y-4">
              <PeriodStatsCard 
                title="今月の精算状況"
                period={format(monthStats.period.start, "yyyy年M月", { locale: ja })}
                stats={monthStats}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 未精算売上一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            未精算売上一覧 ({unpaidSales.length}件)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日時</TableHead>
                <TableHead>顧客名</TableHead>
                <TableHead>サービス</TableHead>
                <TableHead>取り分</TableHead>
                <TableHead>経過日数</TableHead>
                <TableHead>状態</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unpaidSales.map((record) => {
                const daysPassed = Math.floor((new Date().getTime() - record.date.getTime()) / (1000 * 60 * 60 * 24))
                return (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="text-sm">
                        <div>{format(record.date, "M/d(E)", { locale: ja })}</div>
                        <div className="text-gray-500">{format(record.date, "HH:mm")}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{record.customerName}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{record.serviceName}</div>
                        <div className="text-gray-500">{record.location}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">¥{record.castShare.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={daysPassed > 3 ? "destructive" : daysPassed > 1 ? "secondary" : "outline"}
                        className="text-xs"
                      >
                        {daysPassed}日前
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive" className="text-xs">未精算</Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          
          {unpaidSales.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
              すべて精算済みです
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

interface PeriodStatsCardProps {
  title: string
  period: string
  stats: {
    totalSales: number
    totalCastShare: number
    totalPaid: number
    unpaidAmount: number
    unpaidCount: number
    paymentRate: number
  }
}

function PeriodStatsCard({ title, period, stats }: PeriodStatsCardProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-gray-600">{period}</p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <DollarSign className="w-5 h-5 mx-auto mb-1 text-blue-600" />
          <div className="text-lg font-bold">¥{stats.totalSales.toLocaleString()}</div>
          <div className="text-xs text-gray-600">総売上</div>
        </div>
        
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <CreditCard className="w-5 h-5 mx-auto mb-1 text-green-600" />
          <div className="text-lg font-bold">¥{stats.totalPaid.toLocaleString()}</div>
          <div className="text-xs text-gray-600">支払済み</div>
        </div>
        
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <Clock className="w-5 h-5 mx-auto mb-1 text-orange-600" />
          <div className="text-lg font-bold">¥{stats.unpaidAmount.toLocaleString()}</div>
          <div className="text-xs text-gray-600">未精算</div>
        </div>
        
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <TrendingUp className="w-5 h-5 mx-auto mb-1 text-purple-600" />
          <div className="text-lg font-bold">{stats.paymentRate.toFixed(1)}%</div>
          <div className="text-xs text-gray-600">精算率</div>
        </div>
      </div>
      
      {stats.unpaidCount > 0 && (
        <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
          <AlertTriangle className="w-4 h-4 inline mr-1" />
          {stats.unpaidCount}件の売上が未精算です
        </div>
      )}
    </div>
  )
}