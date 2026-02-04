import { notFound } from 'next/navigation'
import { fetchStoreBySlug } from '@/lib/store/public-api'
import { StoreNavigation } from '@/components/store-navigation'
import { StoreFooter } from '@/components/store-footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sparkles, Calendar, Heart, Gift, Crown, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { getPublicRecruitmentData } from '@/lib/store/public-casts'

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

  const segments = [
    cast.height !== null ? `T${cast.height}` : null,
    formatPart('B', cast.bust),
    formatPart('W', cast.waist),
    formatPart('H', cast.hip),
  ].filter(Boolean)
  return segments.join(' ')
}

export default async function RecruitmentPage({ params }: { params: { store: string } }) {
  const { store: storeSlug } = params
  const store = await fetchStoreBySlug(storeSlug)

  if (!store) {
    notFound()
  }

  const recruitmentData = await getPublicRecruitmentData(store.id)
  const { newcomers, graduates } = recruitmentData

  return (
    <>
      <StoreNavigation />

      <main className="min-h-screen bg-[#0b0b0b] text-foreground">
        {/* Header */}
        <div className="relative overflow-hidden border-b border-[#2f2416] bg-[#0f0f0f] py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,206,126,0.18),_transparent_60%)]" />
          <div className="relative mx-auto max-w-6xl px-4 text-center">
            <p className="luxury-display text-xs tracking-[0.45em] text-[#d7b46a]">NEW FACE</p>
            <h1 className="mt-4 flex items-center justify-center gap-3 text-3xl font-semibold text-[#f7e2b5] md:text-4xl">
              <Sparkles className="h-8 w-8 text-[#f3d08a]" />
              入店情報
            </h1>
            <p className="mt-3 text-sm text-[#d7c39c] md:text-base">
              新しく入店したキャストをご紹介
            </p>
          </div>
        </div>

        {/* Welcome Campaign Banner */}
        <section className="luxury-section py-8">
          <div className="mx-auto max-w-4xl px-4">
            <Card className="luxury-panel">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="mb-2 text-2xl font-bold text-[#f5e6c4]">
                      新人入店キャンペーン開催中！
                    </h2>
                    <p className="text-[#d7c39c]">新人キャストをご指名で特別特典をプレゼント</p>
                  </div>
                  <Gift className="h-16 w-16 text-[#f3d08a]" />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* New Cast List */}
        <section className="luxury-section py-8">
          <div className="mx-auto max-w-6xl px-4">
            {newcomers.length === 0 ? (
              <Card className="luxury-panel">
                <CardContent className="flex flex-col items-center gap-3 p-8 text-muted-foreground">
                  <Sparkles className="h-10 w-10 text-[#cbb88f]" />
                  <p className="text-lg font-semibold">現在、表示できる新人キャストはありません。</p>
                  <p className="text-sm">最新の入店情報は順次更新されますので、少々お待ちください。</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {newcomers.map((entry, index) => {
                  const cast = entry.cast
                  const joinDate = new Date(cast.createdAt)
                  const daysSinceJoin = entry.daysSinceJoin
                  const measurement = buildMeasurementLabel(cast)
                  const services = cast.availableServices.slice(0, 4)
                  const introMessage = cast.introMessage ?? 'よろしくお願いします！'

                  return (
                    <Card
                      key={cast.id}
                      className="luxury-panel overflow-hidden transition-shadow hover:shadow-[0_20px_40px_rgba(0,0,0,0.45)]"
                    >
                      <div className="md:flex">
                        <div className="relative md:w-1/3 lg:w-1/4">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={cast.image ?? '/images/non-photo.svg'}
                            alt={cast.name}
                            className="h-full w-full object-cover"
                          />
                          <Badge className="absolute left-4 top-4 bg-[#2fc8b7] px-3 py-1 text-lg text-[#0b1a17]">
                            NEW
                          </Badge>
                          <Badge className="absolute right-4 top-4 bg-[#f6d48a] text-[#2b1b0d]">
                            入店{daysSinceJoin}日目
                          </Badge>
                        </div>

                        <div className="p-6 md:w-2/3 lg:w-3/4">
                          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h3 className="mb-2 text-2xl font-bold text-[#f5e6c4]">{cast.name}</h3>
                              <p className="text-muted-foreground">
                                {cast.age ? `${cast.age}歳` : '年齢非公開'} {measurement}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                <Calendar className="mr-1 inline h-4 w-4 text-[#cbb88f]" />
                                入店日: {format(joinDate, 'yyyy年MM月dd日', { locale: ja })}
                              </p>
                            </div>
                            {index === 0 && (
                              <Badge className="bg-[#f6d48a] text-[#2b1b0d]">
                                <Crown className="mr-1 h-4 w-4" />注目
                              </Badge>
                            )}
                          </div>

                          <Card className="mb-4 border-[#3b2e1f] bg-[#121212]">
                            <CardContent className="p-4">
                              <p className="text-sm italic text-[#d7c39c]">&ldquo;{introMessage}&rdquo;</p>
                            </CardContent>
                          </Card>

                          {services.length > 0 && (
                            <div className="mb-4">
                              <p className="mb-2 text-sm font-semibold text-[#f5e6c4]">得意なプレイ:</p>
                              <div className="flex flex-wrap gap-2">
                                {services.map((service) => (
                                  <Badge key={service} className="border border-[#3b2e1f] bg-[#1a1a1a] text-[#cbb88f]">
                                    {service}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#3b2e1f] bg-[#121212] p-3">
                            <Gift className="h-5 w-5 text-[#f3d08a]" />
                            <span className="font-semibold text-[#f3d08a]">入店特典:</span>
                            <span className="text-[#d7c39c]">
                              {index === 0 ? '指名料無料キャンペーン' : 'オプション1つ無料'}
                            </span>
                          </div>

                          <div className="flex gap-4">
                            <Button asChild className="flex-1">
                              <Link href={`/${store.slug}/cast/${cast.id}`}>
                                <Heart className="mr-2 h-4 w-4" />詳細を見る
                              </Link>
                            </Button>
                            <Button
                              asChild
                              variant="outline"
                              className="flex-1 border-[#3b2e1f] text-[#f5e6c4] hover:bg-[#2b2114]"
                            >
                              <Link href={`/${store.slug}/booking?cast=${cast.id}`}>予約する</Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* Recent Graduates */}
        <section className="luxury-section py-12">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="mb-4 text-center text-2xl font-bold text-[#f5e6c4]">新人卒業キャスト</h2>
            <p className="mb-8 text-center text-muted-foreground">
              入店から一定期間が経過し、新人を卒業したキャストたち
            </p>
            {graduates.length === 0 ? (
              <Card className="luxury-panel">
                <CardContent className="p-6 text-center text-muted-foreground">
                  現在表示できる卒業キャストはありません。
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {graduates.map((entry) => {
                  const cast = entry.cast
                  const measurement = buildMeasurementLabel(cast)
                  return (
                    <Card key={cast.id} className="luxury-panel text-center">
                      <CardContent className="space-y-2 p-4">
                        <div className="mx-auto mb-3 aspect-square w-20 overflow-hidden rounded-full border border-[#4a3b28] bg-[#0f0f0f]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={cast.image ?? '/images/non-photo.svg'}
                            alt={cast.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <h4 className="font-bold text-[#f5e6c4]">{cast.name}</h4>
                        <p className="text-xs text-muted-foreground">{measurement}</p>
                        <Badge variant="outline" className="mt-2 border-[#3b2e1f] text-[#cbb88f]">
                          <TrendingUp className="mr-1 h-3 w-3 text-[#2fc8b7]" />
                          人気上昇中
                        </Badge>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* Call to Action */}
        <section className="border-t border-[#2f2416] bg-[#0f0f0f] py-12">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <h2 className="mb-4 text-2xl font-semibold text-[#f5e6c4] md:text-3xl">
              新人キャストと素敵な時間を
            </h2>
            <p className="mb-8 text-sm text-[#d7c39c] md:text-lg">
              フレッシュな魅力と一生懸命なサービスで
              <br />
              お客様を心から癒します
            </p>
            <Button size="lg" asChild>
              <Link href={`/${store.slug}/booking`}>今すぐ予約する</Link>
            </Button>
          </div>
        </section>

        <StoreFooter store={store} />
      </main>
    </>
  )
}
