'use client'

import { Store } from '@/lib/store/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Heart, Star, Calendar } from 'lucide-react'
import Link from 'next/link'

interface FavoriteCastsProps {
  store: Store
}

export function FavoriteCasts({ store }: FavoriteCastsProps) {
  // Mock favorite casts data
  const favoriteCasts = [
    {
      id: '1',
      name: 'すずか',
      age: 29,
      height: 155,
      measurements: 'T155 B93(F) W58 H90',
      rank: 4,
      isWorking: true,
      nextSchedule: '明日 14:00～',
      lastVisited: new Date('2024-06-10'),
      visitCount: 3,
      image: '/images/cast/suzuka.jpg',
    },
    {
      id: '2',
      name: 'みるく',
      age: 20,
      height: 160,
      measurements: 'T160 B96(G) W62 H98',
      rank: 3,
      isWorking: false,
      nextSchedule: '6/20 15:00～',
      lastVisited: new Date('2024-05-28'),
      visitCount: 1,
      image: '/images/cast/milk.jpg',
    },
    {
      id: '3',
      name: 'さくら',
      age: 26,
      height: 162,
      measurements: 'T162 B88(E) W59 H87',
      rank: 2,
      isWorking: true,
      nextSchedule: '本日 18:00～',
      lastVisited: null,
      visitCount: 0,
      image: '/images/cast/sakura.jpg',
    },
  ]

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-yellow-500">1位</Badge>
    if (rank === 2) return <Badge className="bg-gray-400">2位</Badge>
    if (rank === 3) return <Badge className="bg-orange-600">3位</Badge>
    return <Badge variant="outline">ランク{rank}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Favorites Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {favoriteCasts.map((cast) => (
          <Card key={cast.id} className="overflow-hidden">
            <div className="relative">
              {/* Cast Image */}
              <div className="aspect-[3/4] bg-gradient-to-br from-pink-300 to-purple-400" />

              {/* Favorite Badge */}
              <div className="absolute right-2 top-2">
                <Button size="icon" variant="secondary" className="bg-white/90 backdrop-blur">
                  <Heart className="h-5 w-5 fill-red-500 text-red-500" />
                </Button>
              </div>

              {/* Working Status */}
              {cast.isWorking && (
                <Badge className="absolute left-2 top-2 bg-green-500">出勤中</Badge>
              )}
            </div>

            <CardContent className="p-4">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold">{cast.name}</h3>
                  <p className="text-sm text-gray-500">{cast.age}歳</p>
                </div>
                {getRankBadge(cast.rank)}
              </div>

              <p className="mb-3 text-sm text-gray-600">{cast.measurements}</p>

              {/* Schedule */}
              <div className="mb-3 flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>次回出勤: {cast.nextSchedule}</span>
              </div>

              {/* Visit History */}
              <div className="mb-4 rounded-lg bg-gray-50 p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">利用回数</span>
                  <span className="font-semibold">{cast.visitCount}回</span>
                </div>
                {cast.lastVisited && (
                  <div className="mt-1 flex justify-between text-sm">
                    <span className="text-gray-600">最終利用</span>
                    <span className="font-semibold">
                      {cast.lastVisited.toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link href={`/${store.slug}/cast/${cast.id}`}>詳細を見る</Link>
                </Button>
                <Button size="sm" className="flex-1">
                  予約する
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {favoriteCasts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Heart className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p className="mb-4 text-gray-500">まだお気に入りのキャストがいません</p>
            <Button asChild>
              <Link href={`/${store.slug}/cast`}>キャストを探す</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {favoriteCasts.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 flex items-center gap-2 font-semibold">
              <Star className="h-5 w-5 text-yellow-500" />
              おすすめのキャスト
            </h3>
            <p className="mb-4 text-sm text-gray-600">
              お気に入りキャストの出勤日に合わせて、似たタイプのキャストをご紹介します
            </p>
            <Button variant="outline" className="w-full">
              おすすめを見る
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
