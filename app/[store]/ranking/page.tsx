import { notFound } from 'next/navigation'
import { fetchStoreBySlug } from '@/lib/store/public-api'
import { StoreNavigation } from '@/components/store-navigation'
import { StoreFooter } from '@/components/store-footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Crown, TrendingUp, Star, Heart, Calendar } from 'lucide-react'
import Link from 'next/link'
import { getPublicRankingData } from '@/lib/store/public-casts'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

function buildMeasurementLabel(cast: {
  height: number | null
  bust: string | number | null
  waist: string | number | null
  hip: string | number | null
}) {
  const formatPart = (prefix: string, value: string | number | null) => {
    if (value === null || value === undefined || value === '') {
      return null
    }
    return `${prefix}${value}`
  }

  const parts = [
    cast.height !== null ? `T${cast.height}` : null,
    formatPart('B', cast.bust),
    formatPart('W', cast.waist),
    formatPart('H', cast.hip),
  ].filter(Boolean)
  return parts.join(' ')
}

export default async function RankingPage({ params }: { params: { store: string } }) {
  const { store: storeSlug } = params
  const store = await fetchStoreBySlug(storeSlug)

  if (!store) {
    notFound()
  }

  const rankingData = await getPublicRankingData(store.id)

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-500'
      case 2:
        return 'bg-gray-400'
      case 3:
        return 'bg-orange-600'
      default:
        return 'bg-gray-600'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down':
        return <TrendingUp className="h-4 w-4 rotate-180 text-red-500" />
      default:
        return <span className="text-gray-400">→</span>
    }
  }

  return (
    <>
      <StoreNavigation />

      <main className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 py-12 text-white">
          <div className="mx-auto max-w-7xl px-4">
            <h1 className="mb-4 flex items-center justify-center gap-3 text-center text-4xl font-bold">
              <Crown className="h-10 w-10 text-yellow-300" />
              ランキング
            </h1>
            <p className="text-center text-xl">{store.name}の人気キャストランキング</p>
          </div>
        </div>

        {/* Rankings */}
        <section className="py-8">
          <div className="mx-auto max-w-7xl px-4">
            <Tabs defaultValue="overall" className="space-y-6">
              <TabsList className="mx-auto grid w-full max-w-2xl grid-cols-4">
                <TabsTrigger value="overall">総合</TabsTrigger>
                <TabsTrigger value="new">新人</TabsTrigger>
                <TabsTrigger value="review">口コミ</TabsTrigger>
                <TabsTrigger value="repeat">リピート</TabsTrigger>
              </TabsList>

              <TabsContent value="overall" className="space-y-4">
                {rankingData.overall.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      表示できるランキングがまだありません。
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>総合ランキング TOP5</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {rankingData.overall.map((entry, index) => {
                        const cast = entry.cast
                        const measurement = buildMeasurementLabel(cast)
                        return (
                          <div
                            key={cast.id}
                            className="flex items-center gap-4 rounded-lg bg-gray-50 p-4 transition-colors hover:bg-gray-100"
                          >
                            <Badge className={`px-4 py-2 text-lg ${getRankBadgeColor(index + 1)}`}>
                              {index + 1}
                            </Badge>
                            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-pink-300 to-purple-400">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={cast.image ?? '/images/non-photo.svg'} alt={cast.name} className="h-full w-full object-cover" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-bold">{cast.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {cast.age ? `${cast.age}歳` : '年齢非公開'} {measurement}
                              </p>
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-sm font-medium">{entry.label}</span>
                                {getTrendIcon(entry.trend ?? 'same')}
                              </div>
                            </div>
                            <Button asChild>
                              <Link href={`/${store.slug}/cast/${cast.id}`}>詳細を見る</Link>
                            </Button>
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="new" className="space-y-4">
                {rankingData.newcomers.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      新人キャストが登録され次第、こちらに表示されます。
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>新人ランキング</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {rankingData.newcomers.map((entry, index) => {
                        const cast = entry.cast
                        const measurement = buildMeasurementLabel(cast)
                        const joinDate = format(new Date(cast.createdAt), 'yyyy年MM月dd日', { locale: ja })
                        return (
                          <div
                            key={cast.id}
                            className="flex items-center gap-4 rounded-lg bg-pink-50 p-4 transition-colors hover:bg-pink-100"
                          >
                            <Badge className={`px-4 py-2 text-lg ${getRankBadgeColor(index + 1)}`}>
                              {index + 1}
                            </Badge>
                            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-pink-300 to-purple-400">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={cast.image ?? '/images/non-photo.svg'} alt={cast.name} className="h-full w-full object-cover" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-bold">{cast.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {cast.age ? `${cast.age}歳` : '年齢非公開'} {measurement}
                              </p>
                              <div className="mt-1 flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span className="text-sm">入店日: {joinDate}</span>
                              </div>
                            </div>
                            <Badge variant="secondary" className="bg-pink-200 text-pink-700">
                              NEW
                            </Badge>
                            <Button asChild>
                              <Link href={`/${store.slug}/cast/${cast.id}`}>詳細を見る</Link>
                            </Button>
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="review" className="space-y-4">
                {rankingData.reviews.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      口コミが集まり次第、こちらに表示されます。
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>口コミ評価ランキング</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {rankingData.reviews.map((entry, index) => {
                        const cast = entry.cast
                        return (
                          <div
                            key={cast.id}
                            className="flex items-center gap-4 rounded-lg bg-blue-50 p-4 transition-colors hover:bg-blue-100"
                          >
                            <Badge className={`px-4 py-2 text-lg ${getRankBadgeColor(index + 1)}`}>
                              {index + 1}
                            </Badge>
                            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-blue-300 to-purple-400">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={cast.image ?? '/images/non-photo.svg'} alt={cast.name} className="h-full w-full object-cover" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-bold">{cast.name}</h3>
                              <div className="mt-1 flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  <span className="font-medium">{entry.rating.toFixed(1)}</span>
                                </div>
                                <Badge variant="outline">口コミ {entry.reviewCount}件</Badge>
                              </div>
                            </div>
                            <Button asChild>
                              <Link href={`/${store.slug}/cast/${cast.id}`}>詳細を見る</Link>
                            </Button>
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="repeat" className="space-y-4">
                {rankingData.repeaters.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      リピーターデータが集まり次第、表示されます。
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>リピート指名ランキング</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {rankingData.repeaters.map((entry, index) => {
                        const cast = entry.cast
                        return (
                          <div
                            key={cast.id}
                            className="flex items-center gap-4 rounded-lg bg-green-50 p-4 transition-colors hover:bg-green-100"
                          >
                            <Badge className={`px-4 py-2 text-lg ${getRankBadgeColor(index + 1)}`}>
                              {index + 1}
                            </Badge>
                            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-green-300 to-teal-400">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={cast.image ?? '/images/non-photo.svg'} alt={cast.name} className="h-full w-full object-cover" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-bold">{cast.name}</h3>
                              <p className="text-sm text-muted-foreground">リピート予約が多い注目キャスト</p>
                              <div className="mt-1 flex items-center gap-2">
                                <Heart className="h-4 w-4 text-pink-400" />
                                <span className="text-sm">リピート数 {entry.reservationCount}件</span>
                              </div>
                            </div>
                            <Button asChild>
                              <Link href={`/${store.slug}/cast/${cast.id}`}>詳細を見る</Link>
                            </Button>
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </section>

        <StoreFooter store={store} />
      </main>
    </>
  )
}
