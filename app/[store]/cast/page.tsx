import { notFound } from 'next/navigation'
import { fetchStoreBySlug } from '@/lib/store/public-api'
import { StoreNavigation } from '@/components/store-navigation'
import { StoreFooter } from '@/components/store-footer'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, Heart, Crown } from 'lucide-react'
import Link from 'next/link'
import { getPublicCastProfiles, type PublicCastProfile } from '@/lib/store/public-casts'

function buildMeasurementLabel(cast: PublicCastProfile) {
  const parts = [
    cast.height ? `T${cast.height}` : null,
    cast.bust ? `B${cast.bust}` : null,
    cast.waist ? `W${cast.waist}` : null,
    cast.hip ? `H${cast.hip}` : null,
  ].filter(Boolean)

  return parts.join(' ')
}

export default async function CastListPage({ params }: { params: { store: string } }) {
  const { store: storeSlug } = params
  const store = await fetchStoreBySlug(storeSlug)

  if (!store) {
    notFound()
  }

  const casts: PublicCastProfile[] = await getPublicCastProfiles(store.id)

  return (
    <>
      <StoreNavigation />

      <main className="min-h-screen bg-[#0b0b0b] text-foreground">
        <div className="relative overflow-hidden border-b border-[#2f2416] bg-[#0f0f0f] py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,206,126,0.18),_transparent_60%)]" />
          <div className="relative mx-auto max-w-6xl px-4 text-center">
            <p className="luxury-display text-xs tracking-[0.45em] text-[#d7b46a]">THERAPIST</p>
            <h1 className="mt-4 text-3xl font-semibold text-[#f7e2b5] md:text-4xl">在籍一覧</h1>
            <p className="mt-3 text-sm text-[#d7c39c] md:text-base">
              {store.name}の魅力的なキャスト
            </p>
          </div>
        </div>

        <div className="sticky top-16 z-40 border-b border-[#3b2e1f] bg-[#121212]/95 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-[#3b2e1f] text-[#f5e6c4] hover:bg-[#2b2114]"
              >
                すべて
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-[#3b2e1f] text-[#f5e6c4] hover:bg-[#2b2114]"
              >
                新人
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-[#3b2e1f] text-[#f5e6c4] hover:bg-[#2b2114]"
              >
                本日出勤
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-[#3b2e1f] text-[#f5e6c4] hover:bg-[#2b2114]"
              >
                指名上位
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-[#3b2e1f] text-[#f5e6c4] hover:bg-[#2b2114]"
              >
                ネット予約可
              </Button>
            </div>
          </div>
        </div>

        <section className="py-8">
          <div className="mx-auto max-w-6xl px-4">
            {casts.length === 0 ? (
              <Card className="luxury-panel">
                <CardContent className="p-10 text-center text-muted-foreground">
                  現在、表示できるキャスト情報がありません。最新の在籍状況はお問い合わせください。
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
                {casts.map((cast) => {
                  const measurement = buildMeasurementLabel(cast)
                  return (
                    <Card
                      key={cast.id}
                      className="luxury-panel transition-shadow hover:shadow-[0_20px_40px_rgba(0,0,0,0.45)]"
                    >
                      <CardHeader className="p-4 pb-2">
                        <div className="relative">
                          <div className="mb-3 aspect-[3/4] overflow-hidden rounded-lg border border-[#4a3b28] bg-[#0f0f0f]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={cast.image ?? '/images/non-photo.svg'}
                              alt={cast.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          {cast.panelDesignationRank > 0 && cast.panelDesignationRank <= 3 && (
                            <Badge
                              className={`absolute left-2 top-2 ${
                                cast.panelDesignationRank === 1
                                  ? 'bg-[#f6d48a] text-[#2b1b0d]'
                                  : cast.panelDesignationRank === 2
                                    ? 'bg-[#bfc3c8] text-[#1a1a1a]'
                                    : 'bg-[#c97a3f] text-[#1a1a1a]'
                              }`}
                            >
                              <Crown className="mr-1 h-3 w-3" />
                              {cast.panelDesignationRank}位
                            </Badge>
                          )}
                          {cast.workStatus === '出勤' && (
                            <Badge className="absolute bottom-2 left-2 bg-[#2fc8b7] text-[#0b1a17]">
                              出勤中
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 p-4 pt-0">
                        <div>
                          <h3 className="text-lg font-semibold text-[#f5e6c4]">{cast.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {cast.age ? `${cast.age}歳` : '年齢非公開'} {measurement}
                          </p>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-[#f3d08a] text-[#f3d08a]" />
                            <span className="text-sm font-medium text-[#f5e6c4]">
                              {cast.panelDesignationRank > 0 ? `Rank ${cast.panelDesignationRank}` : '注目キャスト'}
                            </span>
                          </div>
                          <Heart className="h-4 w-4 text-[#f28b96]" />
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {cast.type && (
                            <Badge className="border border-[#3b2e1f] bg-[#1a1a1a] text-xs text-[#cbb88f]">
                              {cast.type}
                            </Badge>
                          )}
                          {cast.netReservation && (
                            <Badge className="border border-[#3b2e1f] bg-[#1a1a1a] text-xs text-[#cbb88f]">
                              ネット予約可
                            </Badge>
                          )}
                          {cast.availableServices.slice(0, 2).map((service) => (
                            <Badge
                              key={service}
                              variant="outline"
                              className="border-[#3b2e1f] text-xs text-[#cbb88f]"
                            >
                              {service}
                            </Badge>
                          ))}
                        </div>

                        <div className="space-y-2 pt-2">
                          <Button asChild className="w-full" size="sm">
                            <Link href={`/${store.slug}/cast/${cast.id}`}>詳細を見る</Link>
                          </Button>
                          <Button
                            asChild
                            variant="outline"
                            className="w-full border-[#3b2e1f] text-[#f5e6c4] hover:bg-[#2b2114]"
                            size="sm"
                          >
                            <Link href={`/${store.slug}/booking?cast=${cast.id}`}>予約する</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <div className="py-8">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-[#3b2e1f] text-[#f5e6c4] hover:bg-[#2b2114]"
              >
                前へ
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-[#3b2e1f] text-[#f5e6c4] hover:bg-[#2b2114]"
              >
                1
              </Button>
              <Button variant="default" size="sm">
                2
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-[#3b2e1f] text-[#f5e6c4] hover:bg-[#2b2114]"
              >
                3
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-[#3b2e1f] text-[#f5e6c4] hover:bg-[#2b2114]"
              >
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
