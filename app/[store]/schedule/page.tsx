/**
 * @design_doc   ui-improvement-instructions.md U-12 metadata
 * @related_to   StoreLayout: store-specific title template; StoreScheduleContent: schedule booking entry
 * @known_issues Selected date is not reflected in metadata
 */
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { fetchStoreBySlug } from '@/lib/store/public-api'
import { StoreNavigation } from '@/components/store-navigation'
import { StoreFooter } from '@/components/store-footer'
import { StoreScheduleContent } from '@/components/store-schedule-content'
import { getPublicStoreSchedule } from '@/lib/store/public-schedule'

export const metadata: Metadata = {
  title: '出勤一覧',
}

export default async function SchedulePage({ params }: { params: Promise<{ store: string }> }) {
  const { store: storeSlug } = await params
  const store = await fetchStoreBySlug(storeSlug)

  if (!store) {
    notFound()
  }

  const scheduleDays = await getPublicStoreSchedule(store.id, { days: 7 })

  return (
    <>
      <StoreNavigation />
      <StoreScheduleContent store={store} scheduleDays={scheduleDays} />
      <StoreFooter store={store} />
    </>
  )
}
