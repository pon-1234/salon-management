'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, Heart, TrendingUp, MessageSquare } from 'lucide-react'
import { Store } from '@/lib/store/types'
import { StoreNavigation } from './store-navigation'

interface StoreHomeContentProps {
  store: Store
}

export function StoreHomeContent({ store }: StoreHomeContentProps) {
  return (
    <>
      <StoreNavigation />
      
      <main>
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-purple-900 via-purple-700 to-pink-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold">
                【{store.name.replace('店', '')}】回春・性感マッサージ
              </h1>
              <p className="text-xl md:text-2xl">
                風俗・デリヘル・出張エステでの施術なら
              </p>
              <p className="text-3xl font-bold text-yellow-300">
                {store.displayName}
              </p>
              <Button size="lg" className="mt-8 bg-yellow-500 hover:bg-yellow-600 text-black font-bold">
                今スグ予約
              </Button>
            </div>
          </div>
        </section>

        {/* Main Message */}
        <section className="py-12 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
            <h2 className="text-3xl font-bold text-gray-800">
              「とにかく全部を気持ちよくしてほしい」
            </h2>
            <p className="text-xl text-purple-600 font-semibold">
              モテる男は睾丸マッサージ
            </p>
            <div className="prose prose-lg mx-auto text-gray-600">
              <p>
                全身で感じるリラクゼーション<br />
                寝ているだけの優越感、非日常の刺激は<br />
                快感快楽だけでなく幸福感を高めます。
              </p>
              <p>
                様々なハラスメント社会の昨今...<br />
                気を遣わずに何もしない時間は少ないのではないでしょうか。
              </p>
              <p className="font-semibold text-purple-700">
                何もしないで気持ちよくなれる幸せが<br />
                集中力を高め<br />
                男性としての喜びを最大限に感じれます。
              </p>
            </div>
          </div>
        </section>

        {/* Ranking Section */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-8 flex items-center justify-center gap-2">
              <TrendingUp className="h-8 w-8 text-yellow-500" />
              ランキング
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { rank: 1, name: 'ことね', age: 27, size: 'T158B95(G)W63H97' },
                { rank: 2, name: 'ののか', age: 31, size: 'T160B84(F)W60H85' },
                { rank: 3, name: 'みるく', age: 20, size: 'T160B96(G)W62H98' },
                { rank: 4, name: 'すずか', age: 29, size: 'T155B93(F)W58H90' },
              ].map((cast) => (
                <Card key={cast.rank} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge className={cn(
                        'text-lg px-3 py-1',
                        cast.rank === 1 ? 'bg-yellow-500' : 
                        cast.rank === 2 ? 'bg-gray-400' :
                        cast.rank === 3 ? 'bg-orange-600' : 'bg-gray-600'
                      )}>
                        {cast.rank}位
                      </Badge>
                      <Heart className="h-5 w-5 text-pink-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-[3/4] bg-gradient-to-br from-pink-300 to-purple-400 rounded-lg mb-3" />
                    <h3 className="font-bold text-lg">{cast.name}</h3>
                    <p className="text-sm text-muted-foreground">{cast.age}歳</p>
                    <p className="text-xs text-muted-foreground mt-1">{cast.size}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="text-center mt-8">
              <Button asChild variant="outline">
                <Link href={`/${store.slug}/ranking`}>もっと見る</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* New Cast Section */}
        <section className="py-12 bg-pink-50">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-8">新人紹介</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'ひかる', age: 28, size: 'T156B83(D)W57H82' },
                { name: 'ゆりこ', age: 27, size: 'T161B86(E)W60H88' },
                { name: 'せな', age: 32, size: 'T157B84(E)W57H83' },
                { name: 'ことね', age: 27, size: 'T158B95(G)W63H97' },
              ].map((cast) => (
                <Card key={cast.name} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="aspect-[3/4] bg-gradient-to-br from-purple-300 to-pink-400 rounded-lg mb-3" />
                    <h3 className="font-bold">{cast.name}</h3>
                    <p className="text-sm text-muted-foreground">{cast.age}歳</p>
                    <p className="text-xs text-muted-foreground">{cast.size}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="text-center mt-8">
              <Button asChild>
                <Link href={`/${store.slug}/cast`}>もっと見る</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Today's Schedule */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-8">本日出勤一覧</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'ののか', age: 31, size: 'T160B84(F)W60H85' },
                { name: 'みなみ', age: 27, size: 'T163B87(G)W64H88' },
                { name: 'すずか', age: 29, size: 'T155B93(F)W58H90' },
                { name: 'きこ', age: 32, size: 'T160B96(G)W64H98' },
              ].map((cast) => (
                <Card key={cast.name} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="aspect-[3/4] bg-gradient-to-br from-blue-300 to-purple-400 rounded-lg mb-3" />
                    <h3 className="font-bold">{cast.name}</h3>
                    <p className="text-sm text-muted-foreground">{cast.age}歳</p>
                    <p className="text-xs text-muted-foreground">{cast.size}</p>
                    <Badge className="mt-2" variant="outline">出勤中</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="text-center mt-8">
              <Button asChild variant="outline">
                <Link href={`/${store.slug}/schedule`}>もっと見る</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Reviews Section */}
        <section className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-8 flex items-center justify-center gap-2">
              <MessageSquare className="h-8 w-8 text-blue-500" />
              お客様の声
            </h2>
            <div className="space-y-6 max-w-4xl mx-auto">
              {[
                {
                  cast: 'すずか',
                  date: '06月08日 21:12',
                  area: '豊島区',
                  review: '容姿もとても綺麗でスタイルも抜群でした！密着も素晴らしかったですし、マッサージもすごくよかったです！',
                  rating: 5
                },
                {
                  cast: 'すずか', 
                  date: '06月07日 17:52',
                  area: '豊島区',
                  review: '初心者でも入り込みやすい、接客能力。マッサージ技術も独特なものがあり身体が楽になりました。',
                  rating: 5
                },
              ].map((review, idx) => (
                <Card key={idx}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-bold">{review.cast}</h4>
                        <p className="text-sm text-muted-foreground">{review.date} {review.area}でご利用</p>
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

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center space-y-4">
              <h3 className="text-2xl font-bold">{store.displayName}</h3>
              <p className="text-lg">{store.phone}</p>
              <p>{store.openingHours.weekday.open}～翌{store.openingHours.weekday.close.split(':')[0]}:00</p>
              <div className="flex justify-center gap-6 mt-6">
                <Link href="/privacy" className="hover:underline">プライバシーポリシー</Link>
                <Link href="/terms" className="hover:underline">ご利用規約</Link>
                <Link href="/recruitment" className="hover:underline">求人情報</Link>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </>
  )
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ')
}