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
        pending: { label: '審査中', className: 'bg-[#f6d48a] text-[#2b1b0d]' },
        hidden: { label: '非公開', className: 'bg-[#2a2a2a] text-[#f5e6c4]' },
      }[review.status]
    : null

  return (
    <Card className="luxury-panel overflow-hidden">
      <CardContent className="p-6">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <h3 className="text-lg font-bold text-[#f5e6c4]">{review.castName}</h3>
              {review.isVerified && (
                <div className="flex items-center gap-1 text-[#2fc8b7]">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs">確認済み</span>
                </div>
              )}
              {statusBadge && (
                <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-[#cbb88f]">
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
                  i < review.rating ? 'fill-[#f3d08a] text-[#f3d08a]' : 'text-[#5a4a2f]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Course and Options */}
        <div className="mb-3 flex flex-wrap gap-2">
          {review.courseName && (
            <Badge variant="outline" className="border-[#3b2e1f] text-[#cbb88f]">
              {review.courseName}
            </Badge>
          )}
          {review.options?.map((option) => (
            <Badge key={option} className="border border-[#3b2e1f] bg-[#1a1a1a] text-[#cbb88f]">
              {option}
            </Badge>
          ))}
        </div>

        {/* Review Content */}
        <p className="mb-4 whitespace-pre-wrap leading-relaxed text-[#f0e3c8]">
          {review.comment}
        </p>

        {/* Tags */}
        {review.tags && review.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {review.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[#3b2e1f] bg-[#1a1a1a] px-2 py-1 text-xs text-[#cbb88f]"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Cast Response */}
        {review.response && (
          <div className="mb-4 rounded-lg border border-[#3b2e1f] bg-[#121212] p-4">
            <div className="flex items-start gap-2">
              <MessageCircle className="mt-0.5 h-5 w-5 text-[#f3d08a]" />
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#f5e6c4]">
                    {review.response.respondedBy}からの返信
                  </span>
                  <span className="text-xs text-[#cbb88f]">
                    {format(review.response.respondedAt, 'yyyy年MM月dd日', { locale: ja })}
                  </span>
                </div>
                <p className="text-sm text-[#d7c39c]">{review.response.content}</p>
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
            className="text-[#cbb88f] hover:text-[#f5e6c4]"
          >
            <ThumbsUp className={`mr-1 h-4 w-4 ${hasVoted ? 'fill-current' : ''}`} />
            参考になった ({helpful})
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
