'use client'

import { useState } from 'react'
import { Store } from '@/lib/store/types'
import { getReviewsByStoreId, getReviewStats } from '@/lib/reviews/data'
import { ReviewCard } from './review-card'
import { ReviewStats } from './review-stats'
import { ReviewFilters } from './review-filters'
import { StoreNavigation } from '../store-navigation'
import { StoreFooter } from '../store-footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

interface ReviewsContentProps {
  store: Store
}

export function ReviewsContent({ store }: ReviewsContentProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'newest' | 'helpful' | 'rating'>('newest')

  const reviews = getReviewsByStoreId(store.id)
  const stats = getReviewStats(store.id)

  // Filter reviews
  let filteredReviews = reviews.filter(review => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = 
        review.content.toLowerCase().includes(searchLower) ||
        review.castName.toLowerCase().includes(searchLower) ||
        review.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      if (!matchesSearch) return false
    }

    if (selectedRating && review.rating !== selectedRating) return false

    if (selectedTags.length > 0) {
      const hasSelectedTag = selectedTags.some(tag => review.tags?.includes(tag))
      if (!hasSelectedTag) return false
    }

    return true
  })

  // Sort reviews
  filteredReviews.sort((a, b) => {
    switch (sortBy) {
      case 'helpful':
        return (b.helpful || 0) - (a.helpful || 0)
      case 'rating':
        return b.rating - a.rating
      case 'newest':
      default:
        return new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
    }
  })

  return (
    <>
      <StoreNavigation />
      
      <main className="min-h-screen bg-gray-50">
        {/* Header */}
        <section className="bg-gradient-to-b from-purple-900 to-pink-900 text-white py-16">
          <div className="max-w-7xl mx-auto px-4">
            <h1 className="text-4xl font-bold mb-4">{store.name} 口コミ・評価</h1>
            <p className="text-xl opacity-90">お客様の生の声をお届けします</p>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <aside className="lg:col-span-1">
              <ReviewStats stats={stats} />
              <ReviewFilters
                selectedRating={selectedRating}
                onRatingChange={setSelectedRating}
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                availableTags={stats.popularTags.map(t => t.tag)}
              />
            </aside>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Search and Sort */}
              <div className="bg-white p-4 rounded-lg shadow mb-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
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
                      onClick={() => setSortBy('newest')}
                    >
                      新着順
                    </Button>
                    <Button
                      variant={sortBy === 'helpful' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSortBy('helpful')}
                    >
                      参考になった順
                    </Button>
                    <Button
                      variant={sortBy === 'rating' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSortBy('rating')}
                    >
                      評価順
                    </Button>
                  </div>
                </div>
              </div>

              {/* Results count */}
              <p className="text-gray-600 mb-4">
                {filteredReviews.length}件の口コミが見つかりました
              </p>

              {/* Reviews List */}
              <div className="space-y-4">
                {filteredReviews.map(review => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>

              {filteredReviews.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">条件に一致する口コミが見つかりませんでした</p>
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