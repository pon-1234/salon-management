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

function buildMeasurementLabel(cast: { height: number | null; bust: string | null; waist: string | null; hip: string | null }) {
  const segments = [
    cast.height ? `T${cast.height}` : null,
    cast.bust ? `B${cast.bust}` : null,
    cast.waist ? `W${cast.waist}` : null,
    cast.hip ? `H${cast.hip}` : null,
  ].filter(Boolean)
  return segments.join(' ')
}

export default async function RecruitmentPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: storeSlug } = await params
  const store = await fetchStoreBySlug(storeSlug)

  if (!store) {
    notFound()
  }

  const recruitmentData = await getPublicRecruitmentData(store.id)
  const { newcomers, graduates } = recruitmentData

  return (
    <>
      <StoreNavigation />

      <main className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 py-12 text-white">
          <div className="mx-auto max-w-7xl px-4">
            <h1 className="mb-4 flex items-center justify-center gap-3 text-center text-4xl font-bold">
              <Sparkles className="h-10 w-10 text-yellow-300" />
              入店情報
            </h1>
            <p className="text-center text-xl">新しく入店したキャストをご紹介</p>
          </div>
        </div>

        {/* Welcome Campaign Banner */}
        <section className="py-8">
          <div className="mx-auto max-w-4xl px-4">
            <Card className="border-pink-200 bg-gradient-to-r from-pink-50 to-purple-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="mb-2 text-2xl font-bold text-purple-800">
                      新人入店キャンペーン開催中！
                    </h2>
                    <p className="text-purple-600">新人キャストをご指名で特別特典をプレゼント</p>
                  </div>
                  <Gift className="h-16 w-16 text-pink-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* New Cast List */}
        <section className="py-8">
          <div className="mx-auto max-w-7xl px-4">
            {newcomers.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 p-8 text-muted-foreground">
                  <Sparkles className="h-10 w-10 text-purple-400" />
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
                    <Card key={cast.id} className="overflow-hidden transition-shadow hover:shadow-xl">
                      <div className="md:flex">
                        <div className="relative md:w-1/3 lg:w-1/4">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={cast.image ?? '/placeholder-user.jpg'}
                            alt={cast.name}
                            className="h-full w-full object-cover"
                          />
                          <Badge className="absolute left-4 top-4 bg-pink-500 px-3 py-1 text-lg text-white">
                            NEW
                          </Badge>
                          <Badge className="absolute right-4 top-4 bg-purple-600 text-white">
                            入店{daysSinceJoin}日目
                          </Badge>
                        </div>

                        <div className="p-6 md:w-2/3 lg:w-3/4">
                          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h3 className="mb-2 text-2xl font-bold">{cast.name}</h3>
                              <p className="text-muted-foreground">
                                {cast.age ? `${cast.age}歳` : '年齢非公開'} {measurement}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                <Calendar className="mr-1 inline h-4 w-4" />
                                入店日: {format(joinDate, 'yyyy年MM月dd日', { locale: ja })}
                              </p>
                            </div>
                            {index === 0 && (
                              <Badge className="bg-yellow-500 text-black">
                                <Crown className="mr-1 h-4 w-4" />注目
                              </Badge>
                            )}
                          </div>

                          <Card className="mb-4 border-pink-200 bg-pink-50">
                            <CardContent className="p-4">
                              <p className="text-sm italic">&ldquo;{introMessage}&rdquo;</p>
                            </CardContent>
                          </Card>

                          {services.length > 0 && (
                            <div className="mb-4">
                              <p className="mb-2 text-sm font-semibold">得意なプレイ:</p>
                              <div className="flex flex-wrap gap-2">
                                {services.map((service) => (
                                  <Badge key={service} variant="secondary">
                                    {service}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="mb-4 flex items-center gap-2 rounded-lg bg-yellow-50 p-3">
                            <Gift className="h-5 w-5 text-yellow-600" />
                            <span className="font-semibold text-yellow-800">入店特典:</span>
                            <span className="text-yellow-700">
                              {index === 0 ? '指名料無料キャンペーン' : 'オプション1つ無料'}
                            </span>
                          </div>

                          <div className="flex gap-4">
                            <Button asChild className="flex-1">
                              <Link href={`/${store.slug}/cast/${cast.id}`}>
                                <Heart className="mr-2 h-4 w-4" />詳細を見る
                              </Link>
                            </Button>
                            <Button asChild variant="outline" className="flex-1">
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
        <section className="bg-white py-12">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="mb-8 text-center text-2xl font-bold">新人卒業キャスト</h2>
            <p className="mb-8 text-center text-muted-foreground">
              入店から一定期間が経過し、新人を卒業したキャストたち
            </p>
            {graduates.length === 0 ? (
              <Card>
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
                    <Card key={cast.id} className="text-center">
                      <CardContent className="space-y-2 p-4">
                        <div className="mx-auto mb-3 aspect-square w-20 overflow-hidden rounded-full bg-gradient-to-br from-blue-300 to-purple-400">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={cast.image ?? '/placeholder-user.jpg'}
                            alt={cast.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <h4 className="font-bold">{cast.name}</h4>
                        <p className="text-xs text-muted-foreground">{measurement}</p>
                        <Badge variant="outline" className="mt-2">
                          <TrendingUp className="mr-1 h-3 w-3" />人気上昇中
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
        <section className="bg-gradient-to-r from-purple-100 to-pink-100 py-12">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <h2 className="mb-4 text-3xl font-bold">新人キャストと素敵な時間を</h2>
            <p className="mb-8 text-lg text-gray-700">
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
