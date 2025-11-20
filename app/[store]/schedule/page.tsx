import { notFound } from 'next/navigation'
import { fetchStoreBySlug } from '@/lib/store/public-api'
import { StoreNavigation } from '@/components/store-navigation'
import { StoreFooter } from '@/components/store-footer'
import { StoreScheduleContent } from '@/components/store-schedule-content'
import { getPublicStoreSchedule } from '@/lib/store/public-schedule'

export default async function SchedulePage({ params }: { params: { store: string } }) {
  const { store: storeSlug } = params
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
