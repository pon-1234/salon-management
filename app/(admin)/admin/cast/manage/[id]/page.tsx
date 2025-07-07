'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CastForm } from '@/components/cast/cast-form'
import { CastDashboard } from '@/components/cast/cast-dashboard'
import { Cast } from '@/lib/cast/types'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  FileText,
  Settings,
  DollarSign,
  CreditCard,
  Calculator,
  BarChart3,
} from 'lucide-react'
import { getAllCasts } from '@/lib/cast/data'
import { CastProfile } from '@/components/cast/cast-profile'
import { PublicProfileForm } from '@/components/cast/public-profile-form'
import { SalesManagementTab } from '@/components/cast/sales-management-tab'
import { PaymentHistoryTab } from '@/components/cast/payment-history-tab'
import { SettlementStatusTab } from '@/components/cast/settlement-status-tab'
import { WorkPerformanceTab } from '@/components/cast/work-performance-tab'

export default function CastManagePage({ params }: { params: { id: string } }) {
  const [cast, setCast] = useState<Cast | null>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const router = useRouter()
  const isNewCast = params.id === 'new'

  useEffect(() => {
    const fetchCast = async () => {
      const castList = getAllCasts()
      const foundCast = castList.find((c) => c.id === params.id)
      setCast(foundCast || null)
    }

    fetchCast()
  }, [params.id, isNewCast])

  const handleSubmit = async (data: Partial<Cast>) => {
    // In a real application, this would make an API call
    console.log('Submitting cast data:', data)
    router.push('/admin/cast/list')
  }

  const handlePublicProfileSubmit = async (data: any) => {
    // In a real application, this would make an API call
    console.log('Submitting public profile data:', data)
    if (cast) {
      setCast({
        ...cast,
        ...data.basicInfo,
        publicProfile: data.publicProfile,
      })
    }
  }

  if (!isNewCast && !cast) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {isNewCast ? '新規キャスト登録' : 'キャスト情報編集'}
            </h1>
            {!isNewCast && cast && (
              <div className="mt-3 flex items-center gap-3">
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                  {cast.workStatus}
                </Badge>
                <Badge variant="outline" className="bg-gray-50 text-gray-600">
                  {cast.type}
                </Badge>
                {cast.netReservation && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-600">
                    ネット予約可
                  </Badge>
                )}
              </div>
            )}
          </div>
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
        </div>

        <div className="mx-auto max-w-7xl">
          {isNewCast ? (
            <CastForm cast={null} onSubmit={handleSubmit} />
          ) : (
            cast && (
              <div className="space-y-6">
                {/* メインダッシュボード */}
                <CastDashboard
                  cast={cast}
                  onUpdate={(data) => {
                    setCast({ ...cast, ...data })
                  }}
                />

                {/* 管理機能タブ */}
                <Tabs defaultValue="profile" className="space-y-6">
                  <TabsList className="border bg-white">
                    <TabsTrigger value="profile" className="data-[state=active]:bg-emerald-50">
                      <FileText className="mr-2 h-4 w-4" />
                      公開プロフィール
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="data-[state=active]:bg-emerald-50">
                      <Settings className="mr-2 h-4 w-4" />
                      詳細設定
                    </TabsTrigger>
                    <TabsTrigger value="sales" className="data-[state=active]:bg-emerald-50">
                      <DollarSign className="mr-2 h-4 w-4" />
                      売上管理
                    </TabsTrigger>
                    <TabsTrigger value="payment" className="data-[state=active]:bg-emerald-50">
                      <CreditCard className="mr-2 h-4 w-4" />
                      入金履歴
                    </TabsTrigger>
                    <TabsTrigger value="settlement" className="data-[state=active]:bg-emerald-50">
                      <Calculator className="mr-2 h-4 w-4" />
                      精算状況
                    </TabsTrigger>
                    <TabsTrigger value="performance" className="data-[state=active]:bg-emerald-50">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      就業成績
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="profile" className="space-y-6">
                    <Tabs defaultValue="view" className="space-y-4">
                      <TabsList className="border-0 bg-gray-100">
                        <TabsTrigger value="view" className="data-[state=active]:bg-white">
                          表示
                        </TabsTrigger>
                        <TabsTrigger value="edit" className="data-[state=active]:bg-white">
                          編集
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="view">
                        <CastProfile cast={cast} />
                      </TabsContent>

                      <TabsContent value="edit">
                        <PublicProfileForm
                          cast={cast}
                          onSubmit={handlePublicProfileSubmit}
                          isEditing={true}
                        />
                      </TabsContent>
                    </Tabs>
                  </TabsContent>

                  <TabsContent value="settings" className="space-y-6">
                    <CastForm cast={cast} onSubmit={handleSubmit} />
                  </TabsContent>

                  <TabsContent value="sales" className="space-y-6">
                    <SalesManagementTab castId={cast.id} castName={cast.name} />
                  </TabsContent>

                  <TabsContent value="payment" className="space-y-6">
                    <PaymentHistoryTab castId={cast.id} castName={cast.name} />
                  </TabsContent>

                  <TabsContent value="settlement" className="space-y-6">
                    <SettlementStatusTab castId={cast.id} castName={cast.name} />
                  </TabsContent>

                  <TabsContent value="performance" className="space-y-6">
                    <WorkPerformanceTab castId={cast.id} castName={cast.name} />
                  </TabsContent>
                </Tabs>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  )
}
