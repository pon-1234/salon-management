'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, Heart, TrendingUp, MessageSquare, Phone } from 'lucide-react'
import { Store } from '@/lib/store/types'
import { StoreNavigation } from './store-navigation'
import { StoreFooter } from './store-footer'
import { CampaignBannerSlider, BannerItem } from './campaign-banner-slider'
import type {
  PublicStoreHomeData,
  PublicCastSummary,
  PublicScheduleSummary,
  PublicReviewSummary,
} from '@/lib/store/public-types'

interface StoreHomeContentProps {
  store: Store
  data: PublicStoreHomeData | null
}

const FALLBACK_STATS = {
  totalCasts: '150+',
  averageRating: '4.8',
  openHoursLabel: '24H',
}

function buildBannerItems(store: Store, data?: PublicStoreHomeData | null): BannerItem[] {
  const banners = data?.banners ?? []
  if (!banners.length) {
    return []
  }

  return banners.map((banner) => ({
    ...banner,
    link: banner.link?.startsWith('/') ? banner.link : banner.link ?? `/${store.slug}/pricing`,
  }))
}

function formatSizeLabel(cast: PublicCastSummary): string {
  if (cast.sizeLabel && cast.sizeLabel.trim().length > 0) {
    return cast.sizeLabel
  }

  const parts = [
    cast.height ? `T${cast.height}` : null,
    cast.bust ? `B${cast.bust}` : null,
    cast.waist ? `W${cast.waist}` : null,
    cast.hip ? `H${cast.hip}` : null,
  ].filter(Boolean)

  return parts.join(' ') || 'サイズ情報未登録'
}

function formatScheduleRange(schedule: PublicScheduleSummary): string {
  try {
    const start = format(new Date(schedule.startTime), 'HH:mm')
    const end = format(new Date(schedule.endTime), 'HH:mm')
    return `${start} - ${end}`
  } catch {
    return '時間未定'
  }
}

function formatReviewDate(review: PublicReviewSummary): string {
  try {
    return format(new Date(review.createdAt), 'MM月dd日 HH:mm', { locale: ja })
  } catch {
    return ''
  }
}

export function StoreHomeContent({ store, data }: StoreHomeContentProps) {
  const banners = buildBannerItems(store, data)
  const ranking = data?.highlights?.ranking ?? []
  const newcomers = data?.highlights?.newcomers ?? []
  const todaysSchedules = data?.highlights?.todaysSchedules ?? []
  const reviews = data?.reviews ?? []

  return (
    <>
      <StoreNavigation />

      <main>
        {/* Hero Section with Video Background */}
        <section className="relative flex h-screen min-h-[600px] items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <video autoPlay muted loop playsInline className="absolute h-full w-full object-cover">
              <source src="/videos/hero-background.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-purple-900/50 to-pink-900/60" />
          </div>

          <div className="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <div className="space-y-6">
              <div className="mb-8">
                <div className="inline-block">
                  <div className="animate-pulse bg-gradient-to-r from-yellow-400 to-pink-400 bg-clip-text text-transparent">
                    <p className="mb-2 text-2xl font-medium md:text-3xl">PREMIUM SALON</p>
                  </div>
                </div>
              </div>

              <h1 className="text-5xl font-bold leading-tight text-white md:text-7xl">
                <span className="mb-2 block">【{store.name.replace('店', '')}】</span>
                <span className="block bg-gradient-to-r from-pink-300 to-yellow-300 bg-clip-text text-transparent">
                  回春・性感マッサージ
                </span>
              </h1>

              <p className="mx-auto max-w-2xl text-xl text-white/90 md:text-2xl">
                風俗・デリヘル・出張エステでの
                <br className="md:hidden" />
                極上の施術なら
              </p>

              <p className="text-4xl font-bold text-yellow-300 drop-shadow-lg md:text-5xl">
                {store.displayName}
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button
                  size="lg"
                  className="transform bg-gradient-to-r from-yellow-500 to-yellow-600 px-8 py-6 text-lg font-bold text-black shadow-xl transition-all duration-200 hover:scale-105 hover:from-yellow-600 hover:to-yellow-700"
                >
                  <Phone className="mr-2 h-5 w-5" />
                  今スグ予約
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white px-8 py-6 text-lg font-bold text-white hover:bg-white hover:text-black"
                  asChild
                >
                  <Link href={`/${store.slug}/cast`}>キャスト一覧を見る</Link>
                </Button>
              </div>

              <div className="mx-auto mt-12 grid max-w-3xl grid-cols-3 gap-4 md:gap-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-300 md:text-4xl">
                    {FALLBACK_STATS.totalCasts}
                  </div>
                  <div className="text-sm text-white/80 md:text-base">在籍キャスト</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-300 md:text-4xl">
                    {FALLBACK_STATS.averageRating}
                  </div>
                  <div className="text-sm text-white/80 md:text-base">平均評価</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-300 md:text-4xl">
                    {FALLBACK_STATS.openHoursLabel}
                  </div>
                  <div className="text-sm text-white/80 md:text-base">営業時間</div>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 transform animate-bounce">
            <div className="flex h-10 w-6 justify-center rounded-full border-2 border-white">
              <div className="mt-2 h-3 w-1 animate-pulse rounded-full bg-white" />
            </div>
          </div>
        </section>

        <CampaignBannerSlider
          banners={banners}
          autoPlayInterval={5000}
          showDots={true}
          dismissible={false}
        />

        <section className="bg-gray-50 py-12">
          <div className="mx-auto max-w-4xl space-y-6 px-4 text-center">
            <h2 className="text-3xl font-bold text-gray-800">
              「とにかく全部を気持ちよくしてほしい」
            </h2>
            <p className="text-xl font-semibold text-purple-600">モテる男は睾丸マッサージ</p>
            <div className="prose prose-lg mx-auto text-gray-600">
              <p>
                全身で感じるリラクゼーション
                <br />
                寝ているだけの優越感、非日常の刺激は
                <br />
                快感快楽だけでなく幸福感を高めます。
              </p>
              <p>
                様々なハラスメント社会の昨今...
                <br />
                気を遣わずに何もしない時間は少ないのではないでしょうか。
              </p>
              <p className="font-semibold text-purple-700">
                何もしないで気持ちよくなれる幸せが
                <br />
                集中力を高め
                <br />
                男性としての喜びを最大限に感じれます。
              </p>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="mb-8 flex items-center justify-center gap-2 text-center text-3xl font-bold">
              <TrendingUp className="h-8 w-8 text-yellow-500" />
              ランキング
            </h2>
            {ranking.length === 0 ? (
              <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-white p-10 text-center text-muted-foreground">
                表示できるランキング情報がありません。
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                {ranking.slice(0, 4).map((cast) => (
                  <RankingCard key={cast.id} cast={cast} />
                ))}
              </div>
            )}
            <div className="mt-8 text-center">
              <Button asChild variant="outline">
                <Link href={`/${store.slug}/ranking`}>もっと見る</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="bg-pink-50 py-12">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="mb-8 text-center text-3xl font-bold">新人紹介</h2>
            {newcomers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-pink-300 bg-white p-10 text-center text-pink-600">
                新人キャストの情報は現在準備中です。
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {newcomers.slice(0, 4).map((cast) => (
                  <CastSummaryCard key={cast.id} cast={cast} />
                ))}
              </div>
            )}
            <div className="mt-8 text-center">
              <Button asChild>
                <Link href={`/${store.slug}/cast`}>もっと見る</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="mb-8 text-center text-3xl font-bold">本日出勤一覧</h2>
            {todaysSchedules.length === 0 ? (
              <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-white p-10 text-center text-muted-foreground">
                本日出勤予定のキャスト情報はありません。最新の出勤情報はスケジュールページでご確認ください。
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {todaysSchedules.slice(0, 4).map((schedule) => (
                  <ScheduleCard key={schedule.castId} schedule={schedule} />
                ))}
              </div>
            )}
            <div className="mt-8 text-center">
              <Button asChild variant="outline">
                <Link href={`/${store.slug}/schedule`}>もっと見る</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="bg-gray-50 py-12">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="mb-8 flex items-center justify-center gap-2 text-center text-3xl font-bold">
              <MessageSquare className="h-8 w-8 text-blue-500" />
              お客様の声
            </h2>
            {reviews.length === 0 ? (
              <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-white p-10 text-center text-muted-foreground">
                まだ口コミが投稿されていません。初めてのご利用後にぜひご感想をお寄せください。
              </div>
            ) : (
              <div className="mx-auto max-w-4xl space-y-6">
                {reviews.slice(0, 6).map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            )}
          </div>
        </section>

        <StoreFooter store={store} />
      </main>
    </>
  )
}

function RankingCard({ cast }: { cast: PublicCastSummary }) {
  return (
    <Card className="transition-shadow hover:shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Badge
            className={cn(
              'px-3 py-1 text-lg',
              cast.panelDesignationRank === 1
                ? 'bg-yellow-500'
                : cast.panelDesignationRank === 2
                  ? 'bg-gray-400'
                  : cast.panelDesignationRank === 3
                    ? 'bg-orange-600'
                    : 'bg-gray-600'
            )}
          >
            {cast.panelDesignationRank > 0 ? `${cast.panelDesignationRank}位` : 'ランク外'}
          </Badge>
          <Heart className="h-5 w-5 text-pink-500" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3 aspect-[3/4] overflow-hidden rounded-lg bg-gradient-to-br from-pink-300 to-purple-400">
          {cast.images[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cast.images[0]} alt={cast.name} className="h-full w-full object-cover" />
          )}
        </div>
        <h3 className="text-lg font-bold">{cast.name}</h3>
        {cast.age && <p className="text-sm text-muted-foreground">{cast.age}歳</p>}
        <p className="mt-1 text-xs text-muted-foreground">{formatSizeLabel(cast)}</p>
      </CardContent>
    </Card>
  )
}

function CastSummaryCard({ cast }: { cast: PublicCastSummary }) {
  return (
    <Card className="transition-shadow hover:shadow-lg">
      <CardContent className="p-4">
        <div className="mb-3 aspect-[3/4] overflow-hidden rounded-lg bg-gradient-to-br from-purple-300 to-pink-400">
          {cast.images[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cast.images[0]} alt={cast.name} className="h-full w-full object-cover" />
          )}
        </div>
        <h3 className="font-bold">{cast.name}</h3>
        {cast.age && <p className="text-sm text-muted-foreground">{cast.age}歳</p>}
        <p className="text-xs text-muted-foreground">{formatSizeLabel(cast)}</p>
      </CardContent>
    </Card>
  )
}

function ScheduleCard({ schedule }: { schedule: PublicScheduleSummary }) {
  const { cast } = schedule
  return (
    <Card className="transition-shadow hover:shadow-lg">
      <CardContent className="p-4">
        <div className="mb-3 aspect-[3/4] overflow-hidden rounded-lg bg-gradient-to-br from-blue-300 to-purple-400">
          {cast.images[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cast.images[0]} alt={cast.name} className="h-full w-full object-cover" />
          )}
        </div>
        <h3 className="font-bold">{cast.name}</h3>
        {cast.age && <p className="text-sm text-muted-foreground">{cast.age}歳</p>}
        <p className="text-xs text-muted-foreground">{formatSizeLabel(cast)}</p>
        <Badge className="mt-2" variant="outline">
          {formatScheduleRange(schedule)}
        </Badge>
      </CardContent>
    </Card>
  )
}

function ReviewCard({ review }: { review: PublicReviewSummary }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h4 className="font-bold">{review.castName}</h4>
            <p className="text-sm text-muted-foreground">{review.customerAlias}</p>
            <p className="text-xs text-muted-foreground">{formatReviewDate(review)}</p>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: review.rating }).map((_, index) => (
              <Star key={index} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
        </div>
        <p className="text-gray-700">{review.comment}</p>
      </CardContent>
    </Card>
  )
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ')
}
