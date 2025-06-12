"use client"

import { Suspense } from 'react'
import { SearchContent } from './search-content'

export default function SearchPage() {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <SearchContent />
    </Suspense>
  )
}
