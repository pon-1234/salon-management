'use client'

import { ReviewStats as ReviewStatsType } from '@/lib/reviews/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Star } from 'lucide-react'

interface ReviewStatsProps {
  stats: ReviewStatsType
}

export function ReviewStats({ stats }: ReviewStatsProps) {
  const maxCount = Math.max(...Object.values(stats.ratingDistribution))

  return (
    <Card className="luxury-panel mb-6">
      <CardHeader>
        <CardTitle className="text-[#f5e6c4]">評価サマリー</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Average Rating */}
        <div className="mb-6 text-center">
          <div className="mb-2 text-4xl font-bold">{stats.averageRating.toFixed(1)}</div>
          <div className="mb-2 flex justify-center">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-6 w-6 ${
                  i < Math.round(stats.averageRating)
                    ? 'fill-[#f3d08a] text-[#f3d08a]'
                    : 'text-[#5a4a2f]'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">{stats.totalReviews}件の評価</p>
        </div>

        {/* Rating Distribution */}
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution]
            const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0

            return (
              <div key={rating} className="flex items-center gap-2">
                <div className="flex w-12 items-center gap-1">
                  <span className="text-sm">{rating}</span>
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                </div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#2f2416]">
                  <div
                    className="h-full bg-[#f3d08a] transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-12 text-right text-sm text-muted-foreground">{count}</span>
              </div>
            )
          })}
        </div>

        {/* Popular Tags */}
        {stats.popularTags.length > 0 && (
          <div className="mt-6">
            <h4 className="mb-3 text-sm font-semibold text-[#f5e6c4]">人気のタグ</h4>
            <div className="flex flex-wrap gap-2">
              {stats.popularTags.slice(0, 5).map(({ tag, count }) => (
                <span
                  key={tag}
                  className="rounded-full border border-[#3b2e1f] bg-[#1a1a1a] px-2 py-1 text-xs text-[#cbb88f]"
                >
                  {tag} ({count})
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
