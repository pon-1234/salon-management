'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, MapPin, Phone, Star, Users } from 'lucide-react'
import { AgeVerification } from '@/components/age-verification'

export default function HomePage() {
  const [isVerified, setIsVerified] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const verified = localStorage.getItem('ageVerified')
    if (verified === 'true') {
      setIsVerified(true)
    }
    setIsLoading(false)
  }, [])

  const handleVerification = (isAdult: boolean) => {
    if (isAdult) {
      localStorage.setItem('ageVerified', 'true')
      setIsVerified(true)
    } else {
      window.location.href = 'https://www.google.com'
    }
  }

  if (isLoading) {
    return null
  }

  if (!isVerified) {
    return <AgeVerification onVerify={handleVerification} />
  }

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="mb-6 text-4xl font-bold md:text-6xl">最高のサロン体験を</h1>
            <p className="mb-8 text-xl text-purple-100 md:text-2xl">
              プロフェッショナルなキャストと上質な空間でお待ちしています
            </p>
            <div className="flex justify-center gap-4">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/ikebukuro">池袋店を見る</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/shinjuku">新宿店を見る</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/shibuya">渋谷店を見る</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-12 text-center text-3xl font-bold">サービスの特徴</h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <Card>
            <CardHeader>
              <Calendar className="mb-4 h-12 w-12 text-purple-600" />
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
              <Users className="mb-4 h-12 w-12 text-purple-600" />
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
              <Star className="mb-4 h-12 w-12 text-purple-600" />
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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-12 text-center text-3xl font-bold">人気のキャスト</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="overflow-hidden transition-shadow hover:shadow-lg">
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
                    <Link href={`/ikebukuro/cast/${i}`}>詳細を見る</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button variant="outline" asChild>
              <Link href="/ikebukuro/cast">すべてのキャストを見る</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Access Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-12 text-center text-3xl font-bold">アクセス</h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <MapPin className="mt-1 h-6 w-6 text-purple-600" />
              <div>
                <h3 className="mb-1 font-semibold">住所</h3>
                <p className="text-gray-600">
                  〒150-0001
                  <br />
                  東京都渋谷区神宮前1-2-3
                  <br />
                  サロンビル 5F
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Clock className="mt-1 h-6 w-6 text-purple-600" />
              <div>
                <h3 className="mb-1 font-semibold">営業時間</h3>
                <p className="text-gray-600">
                  月〜金: 10:00 - 22:00
                  <br />
                  土日祝: 9:00 - 21:00
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Phone className="mt-1 h-6 w-6 text-purple-600" />
              <div>
                <h3 className="mb-1 font-semibold">電話番号</h3>
                <p className="text-gray-600">03-1234-5678</p>
              </div>
            </div>
          </div>
          <div className="h-96 rounded-lg bg-gray-200">
            {/* Map placeholder */}
            <div className="flex h-full items-center justify-center text-gray-500">地図</div>
          </div>
        </div>
      </section>
    </div>
  )
}
