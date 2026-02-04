'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { Store } from '@/lib/store/types'
import type { Review, ReviewStats as ReviewStatsType } from '@/lib/reviews/types'
import { calculateReviewStats } from '@/lib/reviews/utils'
import { ReviewCard } from './review-card'
import { ReviewStats } from './review-stats'
import { ReviewFilters } from './review-filters'
import { StoreNavigation } from '../store-navigation'
import { StoreFooter } from '../store-footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { ReviewSubmissionForm } from './review-submission-form'

interface ReviewsContentProps {
  store: Store
  initialReviews: Review[]
  initialStats: ReviewStatsType
  castFilter?: { id: string; name: string }
}

export function ReviewsContent({ store, initialReviews, initialStats, castFilter }: ReviewsContentProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'newest' | 'helpful' | 'rating'>('newest')

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>()
    reviews.forEach((review) => {
      review.tags?.forEach((tag) => tagSet.add(tag))
    })
    return Array.from(tagSet)
  }, [reviews])

  const stats = useMemo(() => {
    if (reviews.length === initialReviews.length) {
      return initialStats
    }
    return calculateReviewStats(reviews)
  }, [reviews, initialReviews.length, initialStats])

  const filteredReviews = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase()

    return [...reviews]
      .filter((review) => {
        if (normalized) {
          const matchesSearch =
            review.comment.toLowerCase().includes(normalized) ||
            review.castName.toLowerCase().includes(normalized) ||
            review.tags?.some((tag) => tag.toLowerCase().includes(normalized))
          if (!matchesSearch) return false
        }

        if (selectedRating && review.rating !== selectedRating) {
          return false
        }

        if (selectedTags.length > 0) {
          const hasSelectedTag = selectedTags.some((tag) => review.tags?.includes(tag))
          if (!hasSelectedTag) return false
        }

        return true
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'helpful':
            return (b.helpful ?? 0) - (a.helpful ?? 0)
          case 'rating':
            return b.rating - a.rating
          case 'newest':
          default: {
            const aDate = a.visitDate instanceof Date ? a.visitDate : new Date(a.visitDate)
            const bDate = b.visitDate instanceof Date ? b.visitDate : new Date(b.visitDate)
            return bDate.getTime() - aDate.getTime()
          }
        }
      })
  }, [reviews, searchTerm, selectedRating, selectedTags, sortBy])

  const handleReviewCreated = useCallback((review: Review) => {
    setReviews((prev) => [review, ...prev])
  }, [])

  return (
    <>
      <StoreNavigation />

      <main className="min-h-screen bg-[#0b0b0b] text-foreground">
        <section className="relative overflow-hidden border-b border-[#2f2416] bg-[#0f0f0f] py-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,206,126,0.18),_transparent_60%)]" />
          <div className="relative mx-auto max-w-6xl px-4 text-center">
            <p className="luxury-display text-xs tracking-[0.45em] text-[#d7b46a]">VOICE</p>
            <h1 className="mt-4 text-3xl font-semibold text-[#f7e2b5] md:text-4xl">
              {store.name} 口コミ・評価
            </h1>
            <p className="mt-3 text-sm text-[#d7c39c] md:text-base">お客様の生の声をお届けします</p>
          </div>
        </section>

        {castFilter && (
          <div className="mx-auto max-w-6xl px-4 py-6">
            <div className="flex flex-col gap-3 rounded-lg border border-[#3b2e1f] bg-[#121212] px-4 py-3 text-sm text-[#f5e6c4] sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-base font-semibold">
                  キャスト指定: {castFilter.name || '指定キャスト'}
                </p>
                <p className="text-xs text-[#cbb88f]">このキャストの口コミのみ表示しています。</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-[#3b2e1f] text-[#f5e6c4] hover:bg-[#2b2114]"
                asChild
              >
                <Link href={`/${store.slug}/reviews`}>フィルタを解除</Link>
              </Button>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            <aside className="lg:col-span-1 space-y-6">
              <ReviewStats stats={stats} />
              <ReviewFilters
                selectedRating={selectedRating}
                onRatingChange={setSelectedRating}
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                availableTags={availableTags}
              />
            </aside>

            <div className="lg:col-span-3 space-y-6">
              <ReviewSubmissionForm
                storeId={store.id}
                storeSlug={store.slug}
                onReviewCreated={handleReviewCreated}
              />

              <div className="luxury-panel rounded-lg p-4">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-[#cbb88f]" />
                    <Input
                      type="text"
                      placeholder="キャスト名や口コミ内容を検索..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={sortBy === 'newest' ? 'default' : 'outline'}
                      size="sm"
                      className={sortBy === 'newest' ? '' : 'border-[#3b2e1f] text-[#f5e6c4] hover:bg-[#2b2114]'}
                      onClick={() => setSortBy('newest')}
                    >
                      新着順
                    </Button>
                    <Button
                      variant={sortBy === 'helpful' ? 'default' : 'outline'}
                      size="sm"
                      className={sortBy === 'helpful' ? '' : 'border-[#3b2e1f] text-[#f5e6c4] hover:bg-[#2b2114]'}
                      onClick={() => setSortBy('helpful')}
                    >
                      参考になった順
                    </Button>
                    <Button
                      variant={sortBy === 'rating' ? 'default' : 'outline'}
                      size="sm"
                      className={sortBy === 'rating' ? '' : 'border-[#3b2e1f] text-[#f5e6c4] hover:bg-[#2b2114]'}
                      onClick={() => setSortBy('rating')}
                    >
                      評価順
                    </Button>
                  </div>
                </div>
              </div>

              <p className="text-muted-foreground">
                {filteredReviews.length}件の口コミが見つかりました
              </p>

              <div className="space-y-4">
                {filteredReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>

              {filteredReviews.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground">条件に一致する口コミが見つかりませんでした</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <StoreFooter store={store} />
      </main>
    </>
  )
}
