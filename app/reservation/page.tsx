"use client"

import { Suspense } from 'react'
import { ReservationPageContent } from './reservation-page-content'

export default function ReservationPage() {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <ReservationPageContent />
    </Suspense>
  )
}
