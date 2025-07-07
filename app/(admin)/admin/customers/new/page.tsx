'use client'

import { Suspense } from 'react'
import { NewCustomerContent } from './new-customer-content'

export default function NewCustomerPage() {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <NewCustomerContent />
    </Suspense>
  )
}
