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
import { CastRepositoryImpl } from '@/lib/cast/repository-impl'
import { toast } from '@/hooks/use-toast'
import { CastProfile } from '@/components/cast/cast-profile'
import { PublicProfileForm } from '@/components/cast/public-profile-form'
import { SalesManagementTab } from '@/components/cast/sales-management-tab'
import { PaymentHistoryTab } from '@/components/cast/payment-history-tab'
import { SettlementStatusTab } from '@/components/cast/settlement-status-tab'
import { WorkPerformanceTab } from '@/components/cast/work-performance-tab'

export default function CastManagePage({ params }: { params: Promise<{ id: string }> }) {
  const [cast, setCast] = useState<Cast | null>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [id, setId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const castRepository = new CastRepositoryImpl()
  const isNewCast = id === 'new'

  useEffect(() => {
    params.then(({ id: paramId }) => {
      setId(paramId)
    })
  }, [params])

  useEffect(() => {
    if (!id) return
    const fetchCast = async () => {
      setLoading(true)
      try {
        if (!isNewCast) {
          const foundCast = await castRepository.getById(id)
          if (foundCast) {
            setCast(foundCast)
          } else {
            toast({
              title: 'エラー',
              description: 'キャストが見つかりませんでした',
              variant: 'destructive',
            })
            router.push('/admin/cast/list')
          }
        }
      } catch (error) {
        console.error('Error fetching cast:', error)
        toast({
          title: 'エラー',
          description: 'キャスト情報の取得に失敗しました',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchCast()
  }, [id, isNewCast])

  const handleSubmit = async (data: Partial<Cast>) => {
    try {
      if (isNewCast) {
        // Create new cast
        const { id, createdAt, updatedAt, ...createData } = data as Cast
        await castRepository.create(createData)
        toast({
          title: '成功',
          description: 'キャストを作成しました',
        })
      } else {
        // Update existing cast
        await castRepository.update(id, data)
        toast({
          title: '成功',
          description: 'キャスト情報を更新しました',
        })
      }
      router.push('/admin/cast/list')
    } catch (error) {
      console.error('Error saving cast:', error)
      toast({
        title: 'エラー',
        description: 'キャスト情報の保存に失敗しました',
        variant: 'destructive',
      })
    }
  }

  const handlePublicProfileSubmit = async (data: any) => {
    try {
      const updateData = {
        ...data.basicInfo,
        publicProfile: data.publicProfile,
      }
      await castRepository.update(id, updateData)

      // Update local state
      if (cast) {
        setCast({
          ...cast,
          ...updateData,
        })
      }

      toast({
        title: '成功',
        description: '公開プロフィールを更新しました',
      })
      setIsEditingProfile(false)
    } catch (error) {
      console.error('Error updating public profile:', error)
      toast({
        title: 'エラー',
        description: '公開プロフィールの更新に失敗しました',
        variant: 'destructive',
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
