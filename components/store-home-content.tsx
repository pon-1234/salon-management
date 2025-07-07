'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, Heart, TrendingUp, MessageSquare, Phone } from 'lucide-react'
import { Store } from '@/lib/store/types'
import { StoreNavigation } from './store-navigation'
import { StoreFooter } from './store-footer'
import { CampaignBannerSlider, BannerItem } from './campaign-banner-slider'

interface StoreHomeContentProps {
  store: Store
}

export function StoreHomeContent({ store }: StoreHomeContentProps) {
  // Mock banner data - in production, this would come from a CMS or database
  const campaignBanners: BannerItem[] = [
    {
      id: '1',
      imageUrl: '/images/banners/campaign-1.jpg',
      mobileImageUrl: '/images/banners/campaign-1-mobile.jpg',
      title: '新規限定！初回30%OFF',
      link: `/${store.slug}/pricing`,
    },
    {
      id: '2',
      imageUrl: '/images/banners/campaign-2.jpg',
      mobileImageUrl: '/images/banners/campaign-2-mobile.jpg',
      title: '平日限定！延長無料キャンペーン',
      link: `/${store.slug}/pricing`,
    },
    {
      id: '3',
      imageUrl: '/images/banners/campaign-3.jpg',
      mobileImageUrl: '/images/banners/campaign-3-mobile.jpg',
      title: '新人キャスト入店記念イベント',
      link: `/${store.slug}/cast`,
    },
  ]

  return (
    <>
      <StoreNavigation />

      <main>
        {/* Hero Section with Video Background */}
        <section className="relative flex h-screen min-h-[600px] items-center justify-center overflow-hidden">
          {/* Video Background */}
          <div className="absolute inset-0 z-0">
            <video autoPlay muted loop playsInline className="absolute h-full w-full object-cover">
              <source src="/videos/hero-background.mp4" type="video/mp4" />
              {/* Fallback for browsers that don't support video */}
              Your browser does not support the video tag.
            </video>
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-purple-900/50 to-pink-900/60" />
          </div>

          {/* Content */}
          <div className="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <div className="space-y-6">
              {/* Logo or Store Name Animation */}
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

              {/* CTA Buttons */}
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

              {/* Features */}
              <div className="mx-auto mt-12 grid max-w-3xl grid-cols-3 gap-4 md:gap-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-300 md:text-4xl">150+</div>
                  <div className="text-sm text-white/80 md:text-base">在籍キャスト</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-300 md:text-4xl">4.8</div>
                  <div className="text-sm text-white/80 md:text-base">平均評価</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-300 md:text-4xl">24H</div>
                  <div className="text-sm text-white/80 md:text-base">営業時間</div>
                </div>
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 transform animate-bounce">
            <div className="flex h-10 w-6 justify-center rounded-full border-2 border-white">
              <div className="mt-2 h-3 w-1 animate-pulse rounded-full bg-white" />
            </div>
          </div>
        </section>

        {/* Campaign Banner Slider */}
        <CampaignBannerSlider
          banners={campaignBanners}
          autoPlayInterval={5000}
          showDots={true}
          dismissible={false}
        />

        {/* Main Message */}
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

        {/* Ranking Section */}
        <section className="py-12">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="mb-8 flex items-center justify-center gap-2 text-center text-3xl font-bold">
              <TrendingUp className="h-8 w-8 text-yellow-500" />
              ランキング
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
              {[
                { rank: 1, name: 'ことね', age: 27, size: 'T158B95(G)W63H97' },
                { rank: 2, name: 'ののか', age: 31, size: 'T160B84(F)W60H85' },
                { rank: 3, name: 'みるく', age: 20, size: 'T160B96(G)W62H98' },
                { rank: 4, name: 'すずか', age: 29, size: 'T155B93(F)W58H90' },
              ].map((cast) => (
                <Card key={cast.rank} className="transition-shadow hover:shadow-lg">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge
                        className={cn(
                          'px-3 py-1 text-lg',
                          cast.rank === 1
                            ? 'bg-yellow-500'
                            : cast.rank === 2
                              ? 'bg-gray-400'
                              : cast.rank === 3
                                ? 'bg-orange-600'
                                : 'bg-gray-600'
                        )}
                      >
                        {cast.rank}位
                      </Badge>
                      <Heart className="h-5 w-5 text-pink-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-3 aspect-[3/4] rounded-lg bg-gradient-to-br from-pink-300 to-purple-400" />
                    <h3 className="text-lg font-bold">{cast.name}</h3>
                    <p className="text-sm text-muted-foreground">{cast.age}歳</p>
                    <p className="mt-1 text-xs text-muted-foreground">{cast.size}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Button asChild variant="outline">
                <Link href={`/${store.slug}/ranking`}>もっと見る</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* New Cast Section */}
        <section className="bg-pink-50 py-12">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="mb-8 text-center text-3xl font-bold">新人紹介</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { name: 'ひかる', age: 28, size: 'T156B83(D)W57H82' },
                { name: 'ゆりこ', age: 27, size: 'T161B86(E)W60H88' },
                { name: 'せな', age: 32, size: 'T157B84(E)W57H83' },
                { name: 'ことね', age: 27, size: 'T158B95(G)W63H97' },
              ].map((cast) => (
                <Card key={cast.name} className="transition-shadow hover:shadow-lg">
                  <CardContent className="p-4">
                    <div className="mb-3 aspect-[3/4] rounded-lg bg-gradient-to-br from-purple-300 to-pink-400" />
                    <h3 className="font-bold">{cast.name}</h3>
                    <p className="text-sm text-muted-foreground">{cast.age}歳</p>
                    <p className="text-xs text-muted-foreground">{cast.size}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Button asChild>
                <Link href={`/${store.slug}/cast`}>もっと見る</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Today's Schedule */}
        <section className="py-12">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="mb-8 text-center text-3xl font-bold">本日出勤一覧</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { name: 'ののか', age: 31, size: 'T160B84(F)W60H85' },
                { name: 'みなみ', age: 27, size: 'T163B87(G)W64H88' },
                { name: 'すずか', age: 29, size: 'T155B93(F)W58H90' },
                { name: 'きこ', age: 32, size: 'T160B96(G)W64H98' },
              ].map((cast) => (
                <Card key={cast.name} className="transition-shadow hover:shadow-lg">
                  <CardContent className="p-4">
                    <div className="mb-3 aspect-[3/4] rounded-lg bg-gradient-to-br from-blue-300 to-purple-400" />
                    <h3 className="font-bold">{cast.name}</h3>
                    <p className="text-sm text-muted-foreground">{cast.age}歳</p>
                    <p className="text-xs text-muted-foreground">{cast.size}</p>
                    <Badge className="mt-2" variant="outline">
                      出勤中
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Button asChild variant="outline">
                <Link href={`/${store.slug}/schedule`}>もっと見る</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Reviews Section */}
        <section className="bg-gray-50 py-12">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="mb-8 flex items-center justify-center gap-2 text-center text-3xl font-bold">
              <MessageSquare className="h-8 w-8 text-blue-500" />
              お客様の声
            </h2>
            <div className="mx-auto max-w-4xl space-y-6">
              {[
                {
                  cast: 'すずか',
                  date: '06月08日 21:12',
                  area: '豊島区',
                  review:
                    '容姿もとても綺麗でスタイルも抜群でした！密着も素晴らしかったですし、マッサージもすごくよかったです！',
                  rating: 5,
                },
                {
                  cast: 'すずか',
                  date: '06月07日 17:52',
                  area: '豊島区',
                  review:
                    '初心者でも入り込みやすい、接客能力。マッサージ技術も独特なものがあり身体が楽になりました。',
                  rating: 5,
                },
              ].map((review, idx) => (
                <Card key={idx}>
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-start justify-between">
                      <div>
                        <h4 className="font-bold">{review.cast}</h4>
                        <p className="text-sm text-muted-foreground">
                          {review.date} {review.area}でご利用
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {[...Array(review.rating)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-700">{review.review}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <StoreFooter store={store} />
      </main>
    </>
  )
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ')
}
