'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Star } from 'lucide-react'

interface ReviewFiltersProps {
  selectedRating: number | null
  onRatingChange: (rating: number | null) => void
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
  availableTags: string[]
}

export function ReviewFilters({
  selectedRating,
  onRatingChange,
  selectedTags,
  onTagsChange,
  availableTags,
}: ReviewFiltersProps) {
  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag))
    } else {
      onTagsChange([...selectedTags, tag])
    }
  }

  return (
    <Card className="luxury-panel">
      <CardHeader>
        <CardTitle className="text-luxury-gold-cream">絞り込み</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rating Filter */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-luxury-gold-cream">評価</h4>
          <div className="space-y-2">
            <Button
              variant={selectedRating === null ? 'default' : 'outline'}
              size="sm"
              className={`w-full justify-start ${
                selectedRating === null
                  ? ''
                  : 'border-luxury-border text-luxury-gold-cream hover:bg-luxury-brown-muted'
              }`}
              onClick={() => onRatingChange(null)}
            >
              すべて
            </Button>
            {[5, 4, 3, 2, 1].map((rating) => (
              <Button
                key={rating}
                variant={selectedRating === rating ? 'default' : 'outline'}
                size="sm"
                className={`w-full justify-start ${
                  selectedRating === rating
                    ? ''
                    : 'border-luxury-border text-luxury-gold-cream hover:bg-luxury-brown-muted'
                }`}
                onClick={() => onRatingChange(rating)}
              >
                <div className="flex items-center gap-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${
                        i < rating ? 'fill-luxury-gold text-luxury-gold' : 'text-[#5a4a2f]'
                      }`}
                    />
                  ))}
                  <span className="ml-2">以上</span>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Tag Filter */}
        {availableTags.length > 0 && (
          <div>
            <h4 className="mb-3 text-sm font-semibold text-luxury-gold-cream">タグ</h4>
            <div className="space-y-2">
              {availableTags.map((tag) => (
                <div key={tag} className="flex items-center space-x-2">
                  <Checkbox
                    id={tag}
                    checked={selectedTags.includes(tag)}
                    onCheckedChange={() => handleTagToggle(tag)}
                  />
                  <Label
                    htmlFor={tag}
                    className="cursor-pointer text-sm font-normal text-luxury-gold-cream"
                  >
                    {tag}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Clear Filters */}
        {(selectedRating !== null || selectedTags.length > 0) && (
          <Button
            variant="outline"
            size="sm"
            className="w-full border-luxury-border text-luxury-gold-cream hover:bg-luxury-brown-muted"
            onClick={() => {
              onRatingChange(null)
              onTagsChange([])
            }}
          >
            フィルターをクリア
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
