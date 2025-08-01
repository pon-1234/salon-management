import { notFound } from 'next/navigation'
import { getStoreBySlug } from '@/lib/store/data'
import { StoreNavigation } from '@/components/store-navigation'
import { StoreFooter } from '@/components/store-footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sparkles, Calendar, Star, Heart, Gift, Crown } from 'lucide-react'
import Link from 'next/link'
import { format, subDays } from 'date-fns'
import { ja } from 'date-fns/locale'

export default async function RecruitmentPage({ params }: { params: Promise<{ store: string }> }) {
  const { store: storeSlug } = await params
  const store = getStoreBySlug(storeSlug)

  if (!store) {
    notFound()
  }

  // Mock new cast data - in production, this would come from database
  const newCasts = [
    {
      id: 'new1',
      name: 'ひかる',
      age: 28,
      height: 156,
      measurements: { bust: 83, cup: 'D', waist: 57, hip: 82 },
      joinDate: new Date('2024-06-10'),
      introMessage: '初めまして！ひかるです。お客様に最高の癒しをお届けできるよう頑張ります♪',
      specialties: ['オイルマッサージ', 'フェザータッチ', '癒し系'],
      welcomeBonus: '指名料無料',
      imageUrl: '/images/cast/hikaru.jpg',
    },
    {
      id: 'new2',
      name: 'ゆりこ',
      age: 27,
      height: 161,
      measurements: { bust: 86, cup: 'E', waist: 60, hip: 88 },
      joinDate: new Date('2024-06-08'),
      introMessage: 'ゆりこです！明るく楽しい時間を一緒に過ごしましょう。よろしくお願いします！',
      specialties: ['密着マッサージ', 'リンパケア', '会話上手'],
      welcomeBonus: '30分延長無料',
      imageUrl: '/images/cast/yuriko.jpg',
    },
    {
      id: 'new3',
      name: 'せな',
      age: 32,
      height: 157,
      measurements: { bust: 84, cup: 'E', waist: 57, hip: 83 },
      joinDate: new Date('2024-06-05'),
      introMessage: 'せなと申します。大人の魅力でお客様を虜にします。ご指名お待ちしております。',
      specialties: ['テクニシャン', '回春マッサージ', 'Mっ気あり'],
      welcomeBonus: 'オプション1つ無料',
      imageUrl: '/images/cast/sena.jpg',
    },
  ]

  const getDaysFromJoin = (joinDate: Date) => {
    const today = new Date()
    const diffTime = Math.abs(today.getTime() - joinDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

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
            <div className="space-y-8">
              {newCasts.map((cast, index) => (
                <Card key={cast.id} className="overflow-hidden transition-shadow hover:shadow-xl">
                  <div className="md:flex">
                    {/* Cast Image */}
                    <div className="md:w-1/3 lg:w-1/4">
                      <div className="relative aspect-[3/4] bg-gradient-to-br from-pink-300 to-purple-400">
                        {/* New Badge */}
                        <Badge className="absolute left-4 top-4 bg-pink-500 px-3 py-1 text-lg text-white">
                          NEW
                        </Badge>
                        {/* Days Badge */}
                        <Badge className="absolute right-4 top-4 bg-purple-600 text-white">
                          入店{getDaysFromJoin(cast.joinDate)}日目
                        </Badge>
                      </div>
                    </div>

                    {/* Cast Information */}
                    <div className="p-6 md:w-2/3 lg:w-3/4">
                      <div className="mb-4 flex items-start justify-between">
                        <div>
                          <h3 className="mb-2 text-2xl font-bold">{cast.name}</h3>
                          <p className="text-muted-foreground">
                            {cast.age}歳 T{cast.height} B{cast.measurements.bust}(
                            {cast.measurements.cup}) W{cast.measurements.waist} H
                            {cast.measurements.hip}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            <Calendar className="mr-1 inline h-4 w-4" />
                            入店日: {format(cast.joinDate, 'yyyy年MM月dd日', { locale: ja })}
                          </p>
                        </div>
                        {index === 0 && (
                          <Badge className="bg-yellow-500 text-black">
                            <Crown className="mr-1 h-4 w-4" />
                            注目
                          </Badge>
                        )}
                      </div>

                      {/* Introduction Message */}
                      <Card className="mb-4 border-pink-200 bg-pink-50">
                        <CardContent className="p-4">
                          <p className="text-sm italic">&ldquo;{cast.introMessage}&rdquo;</p>
                        </CardContent>
                      </Card>

                      {/* Specialties */}
                      <div className="mb-4">
                        <p className="mb-2 text-sm font-semibold">得意なプレイ:</p>
                        <div className="flex flex-wrap gap-2">
                          {cast.specialties.map((specialty) => (
                            <Badge key={specialty} variant="secondary">
                              {specialty}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Welcome Bonus */}
                      <div className="mb-4 flex items-center gap-2 rounded-lg bg-yellow-50 p-3">
                        <Gift className="h-5 w-5 text-yellow-600" />
                        <span className="font-semibold text-yellow-800">入店特典:</span>
                        <span className="text-yellow-700">{cast.welcomeBonus}</span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-4">
                        <Button asChild className="flex-1">
                          <Link href={`/${store.slug}/cast/${cast.id}`}>
                            <Heart className="mr-2 h-4 w-4" />
                            詳細を見る
                          </Link>
                        </Button>
                        <Button asChild variant="outline" className="flex-1">
                          <Link href={`/${store.slug}/booking?cast=${cast.id}`}>予約する</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Recent Graduates */}
        <section className="bg-white py-12">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="mb-8 text-center text-2xl font-bold">新人卒業キャスト</h2>
            <p className="mb-8 text-center text-muted-foreground">
              入店から3ヶ月が経過し、新人を卒業したキャストたち
            </p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {['ことね', 'みるく', 'あいり', 'れいな'].map((name) => (
                <Card key={name} className="text-center">
                  <CardContent className="p-4">
                    <div className="mb-3 aspect-square rounded-lg bg-gradient-to-br from-blue-300 to-purple-400" />
                    <h4 className="font-bold">{name}</h4>
                    <Badge variant="outline" className="mt-2">
                      <Star className="mr-1 h-3 w-3" />
                      人気上昇中
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
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
