'use client'

import { Button } from '@/components/ui/button'
import { LayoutList, Calendar } from 'lucide-react'

interface ViewToggleProps {
  view: 'timeline' | 'list'
  onViewChange: (view: 'timeline' | 'list') => void
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex gap-2 border-b p-4">
      <Button
        variant={view === 'timeline' ? 'default' : 'outline'}
        className={view === 'timeline' ? 'bg-emerald-600' : ''}
        onClick={() => onViewChange('timeline')}
      >
        <Calendar className="mr-2 h-4 w-4" />
        タイムライン
      </Button>
      <Button
        variant={view === 'list' ? 'default' : 'outline'}
        className={view === 'list' ? 'bg-emerald-600' : ''}
        onClick={() => onViewChange('list')}
      >
        <LayoutList className="mr-2 h-4 w-4" />
        台帳
      </Button>
    </div>
  )
}
