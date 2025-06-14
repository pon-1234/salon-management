'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, MapPin, Phone, Star, Users } from 'lucide-react'
import { AgeVerification } from '@/components/age-verification'
import { useStore } from '@/components/store-provider'

export default function StoreHomePage() {
  const [isVerified, setIsVerified] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const store = useStore()

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              {store.displayName}へようこそ
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-purple-100">
              {store.name}で最高のサロン体験を
            </p>
            <Button size="lg" variant="secondary" asChild>
              <Link href={`/${store.slug}/booking`}>
                今すぐ予約する
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Store Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-12">{store.name}の特徴</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {store.features.map((feature, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle>{feature}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Access Information */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-12">アクセス情報</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <MapPin className="h-6 w-6 text-purple-600 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">住所</h3>
                <p className="text-gray-600">{store.address}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Clock className="h-6 w-6 text-purple-600 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">営業時間</h3>
                <p className="text-gray-600">
                  平日: {store.openingHours.weekday.open} - {store.openingHours.weekday.close}<br />
                  土日祝: {store.openingHours.weekend.open} - {store.openingHours.weekend.close}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Phone className="h-6 w-6 text-purple-600 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">電話番号</h3>
                <p className="text-gray-600">{store.phone}</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-200 rounded-lg h-96">
            <div className="flex items-center justify-center h-full text-gray-500">
              地図
            </div>
          </div>
        </div>
      </section>

      {/* Store Selection */}
      <section className="bg-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-center mb-8">他の店舗を見る</h2>
          <div className="flex justify-center gap-4">
            <Button variant="outline" asChild>
              <Link href="/ikebukuro">池袋店</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/shinjuku">新宿店</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/shibuya">渋谷店</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}