/**
 * @design_doc   Reservation timeline and list view terminology
 * @related_to   ReservationPageContent
 * @known_issues None
 */
'use client'

import { Button } from '@/components/ui/button'
import { LayoutList, Calendar } from 'lucide-react'

interface ViewToggleProps {
  view: 'timeline' | 'list'
  onViewChange: (view: 'timeline' | 'list') => void
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex gap-1 px-2 py-1">
      <Button
        variant={view === 'timeline' ? 'default' : 'outline'}
        className={view === 'timeline' ? 'h-8 bg-emerald-600 text-xs' : 'h-8 text-xs'}
        onClick={() => onViewChange('timeline')}
      >
        <Calendar className="mr-2 h-4 w-4" />
        タイムライン
      </Button>
      <Button
        variant={view === 'list' ? 'default' : 'outline'}
        className={view === 'list' ? 'h-8 bg-emerald-600 text-xs' : 'h-8 text-xs'}
        onClick={() => onViewChange('list')}
      >
        <LayoutList className="mr-2 h-4 w-4" />
        予約一覧
      </Button>
    </div>
  )
}
