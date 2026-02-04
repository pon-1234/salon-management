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
        return 'bg-[#f6d48a] text-[#2b1b0d]'
      case 2:
        return 'bg-[#bfc3c8] text-[#1a1a1a]'
      case 3:
        return 'bg-[#c97a3f] text-[#1a1a1a]'
      default:
        return 'bg-[#2a2a2a] text-[#f5e6c4]'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-[#2fc8b7]" />
      case 'down':
        return <TrendingUp className="h-4 w-4 rotate-180 text-[#e05a4f]" />
      default:
        return <span className="text-[#cbb88f]">→</span>
    }
  }

  return (
    <>
      <StoreNavigation />

      <main className="min-h-screen bg-[#0b0b0b] text-foreground">
        {/* Header */}
        <div className="relative overflow-hidden border-b border-[#2f2416] bg-[#0f0f0f] py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,206,126,0.18),_transparent_60%)]" />
          <div className="relative mx-auto max-w-6xl px-4 text-center">
            <p className="luxury-display text-xs tracking-[0.45em] text-[#d7b46a]">RANKING</p>
            <h1 className="mt-4 flex items-center justify-center gap-3 text-3xl font-semibold text-[#f7e2b5] md:text-4xl">
              <Crown className="h-8 w-8 text-[#f3d08a]" />
              ランキング
            </h1>
            <p className="mt-3 text-sm text-[#d7c39c] md:text-base">
              {store.name}の人気キャストランキング
            </p>
          </div>
        </div>

        {/* Rankings */}
        <section className="py-8">
          <div className="mx-auto max-w-6xl px-4">
            <Tabs defaultValue="overall" className="space-y-6">
              <TabsList className="mx-auto grid w-full max-w-2xl grid-cols-4 border border-[#3b2e1f] bg-[#121212]">
                <TabsTrigger value="overall">総合</TabsTrigger>
                <TabsTrigger value="new">新人</TabsTrigger>
                <TabsTrigger value="review">口コミ</TabsTrigger>
                <TabsTrigger value="repeat">リピート</TabsTrigger>
              </TabsList>

              <TabsContent value="overall" className="space-y-4">
                {rankingData.overall.length === 0 ? (
                  <Card className="luxury-panel">
                    <CardContent className="p-6 text-center text-muted-foreground">
                      表示できるランキングがまだありません。
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="luxury-panel">
                    <CardHeader>
                      <CardTitle className="text-[#f5e6c4]">総合ランキング TOP5</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {rankingData.overall.map((entry, index) => {
                        const cast = entry.cast
                        const measurement = buildMeasurementLabel(cast)
                        return (
                          <div
                            key={cast.id}
                            className="flex items-center gap-4 rounded-lg border border-[#2f2416] bg-[#121212] p-4 transition-colors hover:border-[#f3d08a]"
                          >
                            <Badge className={`px-4 py-2 text-lg ${getRankBadgeColor(index + 1)}`}>
                              {index + 1}
                            </Badge>
                            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-[#4a3b28] bg-[#0f0f0f]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={cast.image ?? '/images/non-photo.svg'} alt={cast.name} className="h-full w-full object-cover" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-[#f5e6c4]">{cast.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {cast.age ? `${cast.age}歳` : '年齢非公開'} {measurement}
                              </p>
                              <div className="mt-1 flex items-center gap-2 text-sm text-[#cbb88f]">
                                <span className="font-medium">{entry.label}</span>
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
                  <Card className="luxury-panel">
                    <CardContent className="p-6 text-center text-muted-foreground">
                      新人キャストが登録され次第、こちらに表示されます。
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="luxury-panel">
                    <CardHeader>
                      <CardTitle className="text-[#f5e6c4]">新人ランキング</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {rankingData.newcomers.map((entry, index) => {
                        const cast = entry.cast
                        const measurement = buildMeasurementLabel(cast)
                        const joinDate = format(new Date(cast.createdAt), 'yyyy年MM月dd日', { locale: ja })
                        return (
                          <div
                            key={cast.id}
                            className="flex items-center gap-4 rounded-lg border border-[#2f2416] bg-[#121212] p-4 transition-colors hover:border-[#f3d08a]"
                          >
                            <Badge className={`px-4 py-2 text-lg ${getRankBadgeColor(index + 1)}`}>
                              {index + 1}
                            </Badge>
                            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-[#4a3b28] bg-[#0f0f0f]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={cast.image ?? '/images/non-photo.svg'} alt={cast.name} className="h-full w-full object-cover" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-[#f5e6c4]">{cast.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {cast.age ? `${cast.age}歳` : '年齢非公開'} {measurement}
                              </p>
                              <div className="mt-1 flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-[#cbb88f]" />
                                <span className="text-sm text-[#cbb88f]">入店日: {joinDate}</span>
                              </div>
                            </div>
                            <Badge className="bg-[#2fc8b7] text-[#0b1a17]">
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
                  <Card className="luxury-panel">
                    <CardContent className="p-6 text-center text-muted-foreground">
                      口コミが集まり次第、こちらに表示されます。
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="luxury-panel">
                    <CardHeader>
                      <CardTitle className="text-[#f5e6c4]">口コミ評価ランキング</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {rankingData.reviews.map((entry, index) => {
                        const cast = entry.cast
                        return (
                          <div
                            key={cast.id}
                            className="flex items-center gap-4 rounded-lg border border-[#2f2416] bg-[#121212] p-4 transition-colors hover:border-[#f3d08a]"
                          >
                            <Badge className={`px-4 py-2 text-lg ${getRankBadgeColor(index + 1)}`}>
                              {index + 1}
                            </Badge>
                            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-[#4a3b28] bg-[#0f0f0f]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={cast.image ?? '/images/non-photo.svg'} alt={cast.name} className="h-full w-full object-cover" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-[#f5e6c4]">{cast.name}</h3>
                              <div className="mt-1 flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 fill-[#f3d08a] text-[#f3d08a]" />
                                  <span className="font-medium text-[#f5e6c4]">{entry.rating.toFixed(1)}</span>
                                </div>
                                <Badge variant="outline" className="border-[#3b2e1f] text-[#cbb88f]">
                                  口コミ {entry.reviewCount}件
                                </Badge>
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
                  <Card className="luxury-panel">
                    <CardContent className="p-6 text-center text-muted-foreground">
                      リピーターデータが集まり次第、表示されます。
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="luxury-panel">
                    <CardHeader>
                      <CardTitle className="text-[#f5e6c4]">リピート指名ランキング</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {rankingData.repeaters.map((entry, index) => {
                        const cast = entry.cast
                        return (
                          <div
                            key={cast.id}
                            className="flex items-center gap-4 rounded-lg border border-[#2f2416] bg-[#121212] p-4 transition-colors hover:border-[#f3d08a]"
                          >
                            <Badge className={`px-4 py-2 text-lg ${getRankBadgeColor(index + 1)}`}>
                              {index + 1}
                            </Badge>
                            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-[#4a3b28] bg-[#0f0f0f]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={cast.image ?? '/images/non-photo.svg'} alt={cast.name} className="h-full w-full object-cover" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-[#f5e6c4]">{cast.name}</h3>
                              <p className="text-sm text-muted-foreground">リピート予約が多い注目キャスト</p>
                              <div className="mt-1 flex items-center gap-2 text-[#cbb88f]">
                                <Heart className="h-4 w-4 text-[#f28b96]" />
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
