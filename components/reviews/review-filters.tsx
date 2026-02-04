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
        <CardTitle className="text-[#f5e6c4]">絞り込み</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rating Filter */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-[#f5e6c4]">評価</h4>
          <div className="space-y-2">
            <Button
              variant={selectedRating === null ? 'default' : 'outline'}
              size="sm"
              className={`w-full justify-start ${
                selectedRating === null ? '' : 'border-[#3b2e1f] text-[#f5e6c4] hover:bg-[#2b2114]'
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
                    : 'border-[#3b2e1f] text-[#f5e6c4] hover:bg-[#2b2114]'
                }`}
                onClick={() => onRatingChange(rating)}
              >
                <div className="flex items-center gap-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${
                        i < rating ? 'fill-[#f3d08a] text-[#f3d08a]' : 'text-[#5a4a2f]'
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
            <h4 className="mb-3 text-sm font-semibold text-[#f5e6c4]">タグ</h4>
            <div className="space-y-2">
              {availableTags.map((tag) => (
                <div key={tag} className="flex items-center space-x-2">
                  <Checkbox
                    id={tag}
                    checked={selectedTags.includes(tag)}
                    onCheckedChange={() => handleTagToggle(tag)}
                  />
                  <Label htmlFor={tag} className="cursor-pointer text-sm font-normal text-[#f5e6c4]">
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
            className="w-full border-[#3b2e1f] text-[#f5e6c4] hover:bg-[#2b2114]"
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
