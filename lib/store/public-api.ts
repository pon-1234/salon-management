import { resolveApiUrl } from '@/lib/http/base-url'
import { buildFallbackHomeData, getFallbackStoreBySlug } from './public-fallbacks'
import type {
  PublicBannerItem,
  PublicCastSummary,
  PublicReviewSummary,
  PublicScheduleSummary,
  PublicStoreHomeData,
} from './public-types'
import type { Store } from './types'

function normalizeStore(raw: any): Store | null {
  if (!raw) {
    return null
  }

  const fallback = getFallbackStoreBySlug(raw.slug ?? raw.id ?? '')
  const openingHours =
    raw.openingHours ??
    fallback?.openingHours ?? {
      weekday: { open: '10:00', close: '22:00' },
      weekend: { open: '9:00', close: '21:00' },
    }

  return {
    id: raw.id ?? fallback?.id ?? '',
    slug: raw.slug ?? fallback?.slug ?? '',
    name: raw.name ?? fallback?.name ?? '',
    displayName: raw.displayName ?? fallback?.displayName ?? raw.name ?? '',
    address: raw.address ?? fallback?.address ?? '',
    phone: raw.phone ?? fallback?.phone ?? '',
    email: raw.email ?? fallback?.email ?? '',
    openingHours,
    location: raw.location ?? fallback?.location ?? { lat: 0, lng: 0 },
    features: raw.features ?? fallback?.features ?? [],
    images: raw.images ?? fallback?.images ?? { main: '', gallery: [] },
    theme: raw.theme ?? fallback?.theme,
    seoTitle: raw.seoTitle ?? fallback?.seoTitle,
    seoDescription: raw.seoDescription ?? fallback?.seoDescription,
    isActive: raw.isActive ?? fallback?.isActive ?? true,
    createdAt: raw.createdAt ? new Date(raw.createdAt) : fallback?.createdAt ?? new Date(),
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : fallback?.updatedAt ?? new Date(),
  }
}

function normalizeCastSummary(raw: any): PublicCastSummary | null {
  if (!raw) return null

  return {
    id: raw.id ?? `cast-${raw.name ?? 'unknown'}`,
    name: raw.name ?? '不明',
    age: raw.age ?? null,
    height: raw.height ?? null,
    bust: raw.bust ?? null,
    waist: raw.waist ?? null,
    hip: raw.hip ?? null,
    type: raw.type ?? null,
    image: raw.image ?? raw.images?.[0] ?? null,
    images: Array.isArray(raw.images) ? raw.images : raw.images ? [raw.images] : [],
    panelDesignationRank: Number.isFinite(raw.panelDesignationRank)
      ? raw.panelDesignationRank
      : 0,
    regularDesignationRank: Number.isFinite(raw.regularDesignationRank)
      ? raw.regularDesignationRank
      : 0,
    netReservation: Boolean(
      raw.netReservation !== undefined ? raw.netReservation : raw.netReservationAvailable ?? true
    ),
    workStatus: raw.workStatus ?? null,
    sizeLabel: raw.sizeLabel ?? buildSizeLabel(raw),
  }
}

function buildSizeLabel(raw: any): string {
  const height = raw.height ? `T${raw.height}` : ''
  const bust = raw.bust ? `B${raw.bust}` : ''
  const waist = raw.waist ? `W${raw.waist}` : ''
  const hip = raw.hip ? `H${raw.hip}` : ''

  return [height, bust, waist, hip].filter(Boolean).join(' ')
}

function normalizeSchedule(raw: any): PublicScheduleSummary | null {
  if (!raw) return null
  const castSummary = normalizeCastSummary(raw.cast ?? raw.castSummary ?? raw)
  if (!castSummary) {
    return null
  }

  return {
    castId: castSummary.id,
    castName: castSummary.name,
    startTime: raw.startTime ?? raw.start ?? '',
    endTime: raw.endTime ?? raw.end ?? '',
    cast: castSummary,
  }
}

function normalizeReview(raw: any): PublicReviewSummary | null {
  if (!raw) return null
  return {
    id: raw.id ?? `review-${Math.random().toString(36).slice(2, 8)}`,
    castId: raw.castId ?? raw.cast?.id ?? '',
    castName: raw.castName ?? raw.cast?.name ?? '匿名キャスト',
    rating: Number.isFinite(raw.rating) ? raw.rating : 0,
    comment: raw.comment ?? raw.content ?? '',
    createdAt: raw.createdAt ?? new Date().toISOString(),
    customerAlias: raw.customerAlias ?? raw.customerName ?? '匿名',
    area: raw.area ?? raw.customerArea ?? null,
  }
}

function normalizeBanner(raw: any, storeSlug: string): PublicBannerItem | null {
  if (!raw) return null
  return {
    id: raw.id ?? `banner-${Math.random().toString(36).slice(2, 8)}`,
    title: raw.title ?? 'キャンペーン',
    imageUrl: raw.imageUrl ?? raw.image ?? '/images/banners/campaign-1.jpg',
    mobileImageUrl: raw.mobileImageUrl ?? raw.mobileImage ?? '/images/banners/campaign-1-mobile.jpg',
    link: raw.link ?? `/${storeSlug}/pricing`,
  }
}

export async function fetchPublicStoreHomeData(
  slug: string
): Promise<PublicStoreHomeData | null> {
  try {
    const response = await fetch(resolveApiUrl(`/api/public/stores/${slug}`), {
      cache: 'no-store',
    })

    if (!response.ok) {
      return buildFallbackHomeData(slug)
    }

    const payload = await response.json()
    const store = normalizeStore(payload.store)
    if (!store) {
      return buildFallbackHomeData(slug)
    }

    const banners: PublicBannerItem[] = Array.isArray(payload.banners)
      ? payload.banners
          .map((banner: any) => normalizeBanner(banner, store.slug))
          .filter(Boolean) as PublicBannerItem[]
      : []

    const ranking: PublicCastSummary[] = Array.isArray(payload.highlights?.ranking)
      ? payload.highlights.ranking
          .map(normalizeCastSummary)
          .filter(Boolean) as PublicCastSummary[]
      : []

    const newcomers: PublicCastSummary[] = Array.isArray(payload.highlights?.newcomers)
      ? payload.highlights.newcomers
          .map(normalizeCastSummary)
          .filter(Boolean) as PublicCastSummary[]
      : []

    const todaysSchedules: PublicScheduleSummary[] = Array.isArray(
      payload.highlights?.todaysSchedules
    )
      ? payload.highlights.todaysSchedules
          .map(normalizeSchedule)
          .filter(Boolean) as PublicScheduleSummary[]
      : []

    const reviews: PublicReviewSummary[] = Array.isArray(payload.reviews)
      ? payload.reviews.map(normalizeReview).filter(Boolean) as PublicReviewSummary[]
      : []

    return {
      store,
      banners,
      highlights: {
        ranking,
        newcomers,
        todaysSchedules,
      },
      reviews,
    }
  } catch (error) {
    console.error('Failed to fetch public store home data:', error)
    return buildFallbackHomeData(slug)
  }
}

export async function fetchStoreBySlug(slug: string): Promise<Store | null> {
  const data = await fetchPublicStoreHomeData(slug)
  if (data?.store) {
    return data.store
  }
  const fallback = getFallbackStoreBySlug(slug)
  return fallback ?? null
}
