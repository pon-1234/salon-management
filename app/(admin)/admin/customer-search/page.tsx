'use client'

import { Suspense } from 'react'
import { CustomerSearchContent } from './customer-search-content'

export default function CustomerSearchResults() {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <CustomerSearchContent />
    </Suspense>
  )
}
