"use client"

import { Suspense } from 'react'
import { ReservationDetailContent } from './reservation-detail-content'

interface ReservationDetailPageProps {
  params: {
    id: string
  }
}

export default function ReservationDetailPage({ params }: ReservationDetailPageProps) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">読み込み中...</div>}>
      <ReservationDetailContent reservationId={params.id} />
    </Suspense>
  )
}