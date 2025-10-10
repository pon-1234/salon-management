import { notFound } from 'next/navigation'
import { getStoreBySlug } from '@/lib/store/data'
import { StoreNavigation } from '@/components/store-navigation'
import { StoreFooter } from '@/components/store-footer'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, Heart, Crown } from 'lucide-react'
import Link from 'next/link'
import { Cast } from '@/lib/cast/types'
import { resolveApiUrl } from '@/lib/http/base-url'
import { normalizeCastList } from '@/lib/cast/mapper'

export default async function CastListPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: storeSlug } = await params
  const store = getStoreBySlug(storeSlug)

  if (!store) {
    notFound()
  }

  let casts: Cast[] = []
  try {
    const response = await fetch(resolveApiUrl('/api/cast'), {
      cache: 'no-store',
    })
    if (response.ok) {
      const payload = await response.json()
      const data = Array.isArray(payload?.data) ? payload.data : payload
      casts = normalizeCastList(data)
    }
  } catch (error) {
    console.error('Failed to load cast data:', error)
  }

  return (
    <>
      <StoreNavigation />

      <main className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 py-12 text-white">
          <div className="mx-auto max-w-7xl px-4">
            <h1 className="mb-4 text-center text-4xl font-bold">在籍一覧</h1>
            <p className="text-center text-xl">{store.name}の魅力的なキャスト</p>
          </div>
        </div>

        {/* Filters */}
        <div className="sticky top-16 z-40 bg-white shadow-sm">
          <div className="mx-auto max-w-7xl px-4 py-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm">
                すべて
              </Button>
              <Button variant="outline" size="sm">
                新人
              </Button>
              <Button variant="outline" size="sm">
                本日出勤
              </Button>
              <Button variant="outline" size="sm">
                巨乳
              </Button>
              <Button variant="outline" size="sm">
                スレンダー
              </Button>
              <Button variant="outline" size="sm">
                20代
              </Button>
              <Button variant="outline" size="sm">
                30代
              </Button>
            </div>
          </div>
        </div>

        {/* Cast Grid */}
        <section className="py-8">
          <div className="mx-auto max-w-7xl px-4">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
              {casts.map((cast) => (
                <Card key={cast.id} className="transition-shadow hover:shadow-lg">
                  <CardHeader className="p-4 pb-2">
                    <div className="relative">
                      <div className="mb-3 aspect-[3/4] overflow-hidden rounded-lg bg-gradient-to-br from-pink-300 to-purple-400">
                        {cast.images[0] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cast.images[0]}
                            alt={cast.name}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      {cast.panelDesignationRank <= 3 && cast.panelDesignationRank > 0 && (
                        <Badge
                          className={`absolute left-2 top-2 ${
                            cast.panelDesignationRank === 1
                              ? 'bg-yellow-500'
                              : cast.panelDesignationRank === 2
                                ? 'bg-gray-400'
                                : 'bg-orange-600'
                          }`}
                        >
                          <Crown className="mr-1 h-3 w-3" />
                          {cast.panelDesignationRank}位
                        </Badge>
                      )}
                      {cast.workStatus === '出勤' && (
                        <Badge className="absolute bottom-2 left-2 bg-green-500">出勤中</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 p-4 pt-0">
                    <div>
                      <h3 className="text-lg font-bold">{cast.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {cast.age}歳 T{cast.height}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        B{cast.bust} W{cast.waist} H{cast.hip}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">
                          {cast.panelDesignationRank > 0 ? `Rank ${cast.panelDesignationRank}` : ''}
                        </span>
                      </div>
                      <Heart className="h-4 w-4 text-pink-400" />
                    </div>

                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {cast.type}
                      </Badge>
                      {cast.netReservation && (
                        <Badge variant="secondary" className="text-xs">
                          ネット予約可
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2 pt-2">
                      <Button asChild className="w-full" size="sm">
                        <Link href={`/${store.slug}/cast/${cast.id}`}>詳細を見る</Link>
                      </Button>
                      <Button asChild variant="outline" className="w-full" size="sm">
                        <Link href={`/${store.slug}/booking?cast=${cast.id}`}>予約する</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pagination */}
        <div className="py-8">
          <div className="mx-auto max-w-7xl px-4">
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm">
                前へ
              </Button>
              <Button variant="outline" size="sm">
                1
              </Button>
              <Button variant="default" size="sm">
                2
              </Button>
              <Button variant="outline" size="sm">
                3
              </Button>
              <Button variant="outline" size="sm">
                次へ
              </Button>
            </div>
          </div>
        </div>

        <StoreFooter store={store} />
      </main>
    </>
  )
}
