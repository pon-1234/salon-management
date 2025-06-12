'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Star, Search, Filter } from 'lucide-react'

export default function CastListPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('popular')

  // Mock data
  const casts = [
    {
      id: '1',
      name: '佐藤 花子',
      nickname: 'Hanako',
      rating: 4.9,
      reviews: 234,
      specialties: ['カット', 'カラー', 'パーマ'],
      experience: 5,
      message: 'お客様一人ひとりに合わせた施術を心がけています。',
      imageUrl: '/placeholder-user.jpg',
      available: true,
    },
    {
      id: '2',
      name: '田中 美咲',
      nickname: 'Misaki',
      rating: 4.8,
      reviews: 189,
      specialties: ['カット', 'トリートメント'],
      experience: 3,
      message: '髪の悩みをお聞かせください。一緒に解決しましょう！',
      imageUrl: '/placeholder-user.jpg',
      available: true,
    },
    {
      id: '3',
      name: '山田 太郎',
      nickname: 'Taro',
      rating: 4.7,
      reviews: 156,
      specialties: ['メンズカット', 'ヘッドスパ'],
      experience: 7,
      message: 'メンズスタイルはお任せください。',
      imageUrl: '/placeholder-user.jpg',
      available: false,
    },
    {
      id: '4',
      name: '鈴木 あゆみ',
      nickname: 'Ayumi',
      rating: 4.9,
      reviews: 298,
      specialties: ['カラー', 'ハイライト', 'バレイヤージュ'],
      experience: 8,
      message: 'トレンドカラーで新しい自分を見つけましょう。',
      imageUrl: '/placeholder-user.jpg',
      available: true,
    },
  ]

  const filteredCasts = casts.filter(cast =>
    cast.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cast.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cast.specialties.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const sortedCasts = [...filteredCasts].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating
      case 'reviews':
        return b.reviews - a.reviews
      case 'experience':
        return b.experience - a.experience
      default:
        return 0
    }
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">キャスト一覧</h1>
        <p className="text-gray-600">
          経験豊富なプロフェッショナルがあなたをお待ちしています
        </p>
      </div>

      {/* Search and Filter */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="名前、スペシャリティで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="並び替え" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">人気順</SelectItem>
              <SelectItem value="rating">評価順</SelectItem>
              <SelectItem value="reviews">レビュー数順</SelectItem>
              <SelectItem value="experience">経験年数順</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cast Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedCasts.map((cast) => (
          <Card key={cast.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="aspect-[4/3] bg-gradient-to-br from-purple-400 to-pink-400 relative">
              {!cast.available && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <Badge variant="secondary" className="text-lg px-4 py-2">
                    本日予約不可
                  </Badge>
                </div>
              )}
            </div>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">{cast.nickname}</CardTitle>
                  <CardDescription>{cast.name}</CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{cast.rating}</span>
                  <span className="text-sm text-gray-500">({cast.reviews})</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">得意な施術</p>
                <div className="flex flex-wrap gap-2">
                  {cast.specialties.map((specialty) => (
                    <Badge key={specialty} variant="outline" className="text-xs">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">経験年数</p>
                <p className="font-medium">{cast.experience}年</p>
              </div>
              <p className="text-sm text-gray-600 italic">"{cast.message}"</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" asChild>
                  <Link href={`/cast/${cast.id}`}>
                    詳細を見る
                  </Link>
                </Button>
                <Button className="flex-1" disabled={!cast.available} asChild>
                  <Link href={`/booking?cast=${cast.id}`}>
                    予約する
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {sortedCasts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">該当するキャストが見つかりませんでした。</p>
        </div>
      )}
    </div>
  )
}