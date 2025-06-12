import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, MapPin, Phone, Star, Users } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              最高のサロン体験を
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-purple-100">
              プロフェッショナルなキャストと上質な空間でお待ちしています
            </p>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/booking">
                今すぐ予約する
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-12">サービスの特徴</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <Calendar className="h-12 w-12 text-purple-600 mb-4" />
              <CardTitle>簡単予約</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                24時間いつでもオンラインで予約可能。お好きな時間とキャストを選択できます。
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Users className="h-12 w-12 text-purple-600 mb-4" />
              <CardTitle>プロのキャスト</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                経験豊富なプロフェッショナルが、あなたのニーズに合わせた最高のサービスを提供します。
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Star className="h-12 w-12 text-purple-600 mb-4" />
              <CardTitle>高評価</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                多くのお客様から高い評価をいただいています。安心してご利用ください。
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Popular Casts Section */}
      <section className="bg-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">人気のキャスト</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square bg-gradient-to-br from-purple-400 to-pink-400" />
                <CardHeader>
                  <CardTitle>キャスト {i}</CardTitle>
                  <CardDescription>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>4.8</span>
                      <span className="text-gray-500">(120)</span>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/dashboard/cast/${i}`}>
                      詳細を見る
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Button variant="outline" asChild>
              <Link href="/dashboard/cast">
                すべてのキャストを見る
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Access Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-12">アクセス</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <MapPin className="h-6 w-6 text-purple-600 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">住所</h3>
                <p className="text-gray-600">
                  〒150-0001<br />
                  東京都渋谷区神宮前1-2-3<br />
                  サロンビル 5F
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Clock className="h-6 w-6 text-purple-600 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">営業時間</h3>
                <p className="text-gray-600">
                  月〜金: 10:00 - 22:00<br />
                  土日祝: 9:00 - 21:00
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Phone className="h-6 w-6 text-purple-600 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">電話番号</h3>
                <p className="text-gray-600">
                  03-1234-5678
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-200 rounded-lg h-96">
            {/* Map placeholder */}
            <div className="flex items-center justify-center h-full text-gray-500">
              地図
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}