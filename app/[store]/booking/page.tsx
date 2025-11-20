import { notFound } from 'next/navigation'
import { StoreNavigation } from '@/components/store-navigation'
import { StoreFooter } from '@/components/store-footer'
import { fetchStoreBySlug } from '@/lib/store/public-api'
import { getPublicCastProfiles } from '@/lib/store/public-casts'
import { getPublicStorePricing } from '@/lib/store/public-pricing'
import { StoreBookingContent } from '@/components/store-booking/store-booking-content'

type SerializableCourse = {
  id: string
  name: string
  duration: number
  price: number
  description: string | null
  enableWebBooking: boolean
}

type SerializableOption = {
  id: string
  name: string
  price: number
  description: string | null
  note: string | null
  category: string
  isPopular: boolean
}

export default async function StoreBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string }>
  searchParams: Promise<{ cast?: string | string[]; slot?: string | string[] }>
}) {
  const [{ store: storeSlug }, resolvedSearchParams] = await Promise.all([params, searchParams])
  const store = await fetchStoreBySlug(storeSlug)

  if (!store) {
    notFound()
  }

  const [casts, pricing] = await Promise.all([
    getPublicCastProfiles(store.id),
    getPublicStorePricing(store.id),
  ])

  const courses: SerializableCourse[] = pricing.courses
    .filter((course) => course.enableWebBooking !== false)
    .map((course) => ({
      id: course.id,
      name: course.name,
      duration: course.duration,
      price: course.price,
      description: course.description ?? null,
      enableWebBooking: course.enableWebBooking !== false,
    }))

  const options: SerializableOption[] = pricing.options.map((option) => ({
    id: option.id,
    name: option.name,
    price: option.price,
    description: option.description ?? null,
    note: option.note ?? null,
    category: option.category ?? 'special',
    isPopular: Boolean(option.isPopular),
  }))

  const initialCastIdParam = resolvedSearchParams?.cast
  const initialCastId = Array.isArray(initialCastIdParam)
    ? initialCastIdParam[0]
    : initialCastIdParam ?? null

  const slotParam = resolvedSearchParams?.slot
  const initialSlotStart = Array.isArray(slotParam) ? slotParam[0] : slotParam ?? null

  return (
    <>
      <StoreNavigation />
      <StoreBookingContent
        casts={casts}
        courses={courses}
        options={options}
        initialCastId={initialCastId}
        initialSlotStart={initialSlotStart}
      />
      <StoreFooter store={store} />
    </>
  )
}
