'use client'

import { useState } from 'react'
import { Review } from '@/lib/reviews/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, ThumbsUp, CheckCircle, MessageCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface ReviewCardProps {
  review: Review
}

export function ReviewCard({ review }: ReviewCardProps) {
  const [helpful, setHelpful] = useState(review.helpful || 0)
  const [hasVoted, setHasVoted] = useState(false)

  const handleHelpful = () => {
    if (!hasVoted) {
      setHelpful(helpful + 1)
      setHasVoted(true)
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-lg">{review.castName}</h3>
              {review.isVerified && (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs">確認済み</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{format(review.visitDate, 'yyyy年MM月dd日', { locale: ja })}</span>
              {review.customerArea && (
                <>
                  <span>•</span>
                  <span>{review.customerArea}でご利用</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-5 w-5 ${
                  i < review.rating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Course and Options */}
        <div className="flex flex-wrap gap-2 mb-3">
          {review.courseType && (
            <Badge variant="outline">{review.courseType}</Badge>
          )}
          {review.options?.map(option => (
            <Badge key={option} variant="secondary">{option}</Badge>
          ))}
        </div>

        {/* Review Content */}
        <p className="text-gray-700 leading-relaxed mb-4">{review.content}</p>

        {/* Tags */}
        {review.tags && review.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {review.tags.map(tag => (
              <span
                key={tag}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Cast Response */}
        {review.response && (
          <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <MessageCircle className="h-5 w-5 text-pink-600 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-pink-800">
                    {review.response.respondedBy}からの返信
                  </span>
                  <span className="text-xs text-gray-500">
                    {format(review.response.respondedAt, 'yyyy年MM月dd日', { locale: ja })}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{review.response.content}</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleHelpful}
            disabled={hasVoted}
            className="text-gray-600"
          >
            <ThumbsUp className={`h-4 w-4 mr-1 ${hasVoted ? 'fill-current' : ''}`} />
            参考になった ({helpful})
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}