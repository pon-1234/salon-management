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

  const visitDate = review.visitDate instanceof Date ? review.visitDate : new Date(review.visitDate)
  const statusBadge = review.status !== 'published'
    ? {
        pending: { label: '審査中', className: 'bg-amber-100 text-amber-700' },
        hidden: { label: '非公開', className: 'bg-gray-100 text-gray-600' },
      }[review.status]
    : null

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <h3 className="text-lg font-bold">{review.castName}</h3>
              {review.isVerified && (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs">確認済み</span>
                </div>
              )}
              {statusBadge && (
                <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{format(visitDate, 'yyyy年MM月dd日', { locale: ja })}</span>
              {review.customerArea && (
                <>
                  <span>•</span>
                  <span>{review.customerArea}でご利用</span>
                </>
              )}
              {review.customerAlias && (
                <>
                  <span>•</span>
                  <span>{review.customerAlias}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-5 w-5 ${
                  i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Course and Options */}
        <div className="mb-3 flex flex-wrap gap-2">
          {review.courseName && <Badge variant="outline">{review.courseName}</Badge>}
          {review.options?.map((option) => (
            <Badge key={option} variant="secondary">
              {option}
            </Badge>
          ))}
        </div>

        {/* Review Content */}
        <p className="mb-4 leading-relaxed text-gray-700 whitespace-pre-wrap">{review.comment}</p>

        {/* Tags */}
        {review.tags && review.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {review.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Cast Response */}
        {review.response && (
          <div className="mb-4 rounded-lg border border-pink-200 bg-pink-50 p-4">
            <div className="flex items-start gap-2">
              <MessageCircle className="mt-0.5 h-5 w-5 text-pink-600" />
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-semibold text-pink-800">
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
        <div className="flex items-center justify-between border-t pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleHelpful}
            disabled={hasVoted}
            className="text-gray-600"
          >
            <ThumbsUp className={`mr-1 h-4 w-4 ${hasVoted ? 'fill-current' : ''}`} />
            参考になった ({helpful})
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
