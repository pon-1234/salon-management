'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { CastForm } from '@/components/cast/cast-form'
import { CastDashboard } from '@/components/cast/cast-dashboard'
import { Cast } from '@/lib/cast/types'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  FileText,
  Settings,
  DollarSign,
  CreditCard,
  Calculator,
  BarChart3,
  AlertTriangle,
} from 'lucide-react'
import { CastRepositoryImpl } from '@/lib/cast/repository-impl'
import { toast } from '@/hooks/use-toast'
import { CastProfile } from '@/components/cast/cast-profile'
import { PublicProfileForm } from '@/components/cast/public-profile-form'
import { SalesManagementTab } from '@/components/cast/sales-management-tab'
import { PaymentHistoryTab } from '@/components/cast/payment-history-tab'
import { SettlementStatusTab } from '@/components/cast/settlement-status-tab'
import { WorkPerformanceTab } from '@/components/cast/work-performance-tab'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useStore } from '@/contexts/store-context'

export default function CastManagePage({ params }: { params: { id: string } }) {
  const { currentStore } = useStore()
  const [cast, setCast] = useState<Cast | null>(null)
  const [id, setId] = useState<string>(params.id ?? '')
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()
  const castRepository = useMemo(
    () => new CastRepositoryImpl(undefined, currentStore.id),
    [currentStore.id]
  )
  const isNewCast = id === 'new'

  useEffect(() => {
    setId(params.id ?? '')
  }, [params.id])

  useEffect(() => {
    if (!id) return
    const fetchCast = async () => {
      setLoading(true)
      try {
        if (!isNewCast) {
          const foundCast = await castRepository.getById(id)
          setCast(foundCast)
          if (!foundCast) {
            toast({
              title: 'キャストが見つかりません',
              description: 'URLが古いか、キャストが削除された可能性があります。',
              variant: 'destructive',
            })
          }
        }
      } catch (error) {
        console.error('Error fetching cast:', error)
        toast({
          title: 'エラー',
          description: 'キャスト情報の取得に失敗しました',
          variant: 'destructive',
        })
        setCast(null)
      } finally {
        setLoading(false)
      }
    }

    fetchCast()
  }, [id, isNewCast, castRepository, router])

  const handleSubmit = async (data: Partial<Cast>) => {
    setIsSaving(true)
    try {
      if (isNewCast) {
        // Create new cast
        const { id, createdAt, updatedAt, ...createData } = data as Cast
        await castRepository.create(createData)
        toast({
          title: '✓ 作成完了',
          description: 'キャスト情報を作成しました',
        })
        router.push('/admin/cast/list')
      } else {
        // Update existing cast
        const updatedCast = await castRepository.update(id, data)
        setCast((prev) => (prev ? { ...prev, ...updatedCast } : prev))
        toast({
          title: '✓ 保存完了',
          description: 'キャスト情報を更新しました',
        })
      }
    } catch (error) {
      console.error('Error saving cast:', error)
      toast({
        title: 'エラー',
        description: 'キャスト情報の保存に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublicProfileSubmit = async (data: any) => {
    setIsSaving(true)
    try {
      const updateData = {
        ...data.basicInfo,
        publicProfile: data.publicProfile,
      }
      await castRepository.update(id, updateData)

      // Update local state
      setCast((prev) => (prev ? { ...prev, ...updateData } : prev))

      toast({
        title: '✓ 保存完了',
        description: '公開プロフィールを更新しました',
        duration: 3000,
      })
    } catch (error) {
      console.error('Error updating public profile:', error)
      toast({
        title: 'エラー',
        description: '公開プロフィールの更新に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!isNewCast && loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <span className="text-sm text-muted-foreground">読み込み中...</span>
      </div>
    )
  }

  if (!isNewCast && !loading && !cast) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="flex flex-1 items-center justify-center px-6 py-16">
          <Card className="max-w-xl text-center">
            <CardHeader>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <CardTitle>キャストが見つかりませんでした</CardTitle>
              <CardDescription>
                リンクが古い、またはキャストが削除された可能性があります。キャスト一覧から最新の情報を確認してください。
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button onClick={() => router.push('/admin/cast/list')}>キャスト一覧へ戻る</Button>
              <Button variant="ghost" onClick={() => router.back()}>
                前のページに戻る
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
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
            <CastForm cast={null} onSubmit={handleSubmit} onCancel={() => router.back()} isSubmitting={isSaving} />
          ) : (
            cast && (
              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="border bg-white">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-50">
                    <FileText className="mr-2 h-4 w-4" />
                    プロフィール概要
                  </TabsTrigger>
                  <TabsTrigger value="edit" className="data-[state=active]:bg-emerald-50">
                    <Settings className="mr-2 h-4 w-4" />
                    プロフィール編集
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

                <TabsContent value="overview" className="space-y-6">
                  <CastDashboard
                    cast={cast}
                    onUpdate={(data) => {
                      setCast((prev) => (prev ? { ...prev, ...data } : prev))
                    }}
                  />
                  <CastProfile cast={cast} />
                </TabsContent>

                <TabsContent value="edit" className="space-y-10">
                  <section className="space-y-4">
                    <div>
                      <h2 className="text-xl font-semibold">基本情報・詳細設定</h2>
                      <p className="text-sm text-muted-foreground">
                        キャストの基本情報や稼働ステータス、料金設定を更新します。保存するとすぐに管理画面へ反映されます。
                      </p>
                    </div>
                    <CastForm cast={cast} onSubmit={handleSubmit} onCancel={() => router.back()} isSubmitting={isSaving} />
                  </section>

                  <Separator />

                  <section className="space-y-4">
                    <div>
                      <h2 className="text-xl font-semibold">公開プロフィール</h2>
                      <p className="text-sm text-muted-foreground">
                        店舗サイトに表示される紹介情報を編集します。保存すると公開ページの表示が更新されます。
                      </p>
                    </div>
                    <PublicProfileForm
                      cast={cast}
                      onSubmit={handlePublicProfileSubmit}
                      isEditing={true}
                      isSubmitting={isSaving}
                    />
                  </section>
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
            )
          )}
        </div>
      </main>
    </div>
  )
}
