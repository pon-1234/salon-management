"use client"

import { Suspense } from 'react'
import { HotelSearchContent } from './hotel-search-content'

export default function HotelSearchResults() {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <HotelSearchContent />
    </Suspense>
  )
}
