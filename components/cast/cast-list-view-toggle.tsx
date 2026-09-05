'use client'

/**
 * @design_doc https://app.notion.com/p/3ccdda8d8bde80b19a27f2cd7dd8a2d1
 * @related_to CastListActionButtons: shares the compact toolbar
 * @known_issues None
 */

import { Button } from '@/components/ui/button'
import { LayoutGrid, LayoutList } from 'lucide-react'

interface CastListViewToggleProps {
  view: 'grid' | 'list'
  onViewChange: (view: 'grid' | 'list') => void
}

export function CastListViewToggle({ view, onViewChange }: CastListViewToggleProps) {
  return (
    <div className="flex gap-1">
      <Button
        size="sm"
        variant={view === 'grid' ? 'default' : 'outline'}
        className={view === 'grid' ? 'bg-emerald-600' : ''}
        onClick={() => onViewChange('grid')}
      >
        <LayoutGrid className="mr-2 h-4 w-4" />
        グリッド
      </Button>
      <Button
        size="sm"
        variant={view === 'list' ? 'default' : 'outline'}
        className={view === 'list' ? 'bg-emerald-600' : ''}
        onClick={() => onViewChange('list')}
      >
        <LayoutList className="mr-2 h-4 w-4" />
        リスト
      </Button>
    </div>
  )
}
