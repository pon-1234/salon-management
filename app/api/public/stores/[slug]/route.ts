import { NextResponse } from 'next/server'
import { addHours, startOfDay, endOfDay } from 'date-fns'
import { db } from '@/lib/db'
import logger from '@/lib/logger'
import { parseBusinessHoursString, DEFAULT_BUSINESS_HOURS } from '@/lib/settings/business-hours'
import { getFallbackStoreBySlug, buildFallbackHomeData } from '@/lib/store/public-fallbacks'

function buildSizeLabel(cast: any): string {
  const height = cast?.height ? `T${cast.height}` : ''
  const bust = cast?.bust ? `B${cast.bust}` : ''
  const waist = cast?.waist ? `W${cast.waist}` : ''
  const hip = cast?.hip ? `H${cast.hip}` : ''
  return [height, bust, waist, hip].filter(Boolean).join(' ')
}

function normalizeOpeningHours(store: any, storeSettings: any, fallback: any) {
  const businessHoursRange = storeSettings?.businessHours
    ? parseBusinessHoursString(storeSettings.businessHours, DEFAULT_BUSINESS_HOURS)
    : DEFAULT_BUSINESS_HOURS

  const fallbackOpeningHours =
    fallback?.openingHours ?? ({
      weekday: { open: businessHoursRange.startLabel, close: businessHoursRange.endLabel },
      weekend: { open: businessHoursRange.startLabel, close: businessHoursRange.endLabel },
    } as const)

  return {
    weekday: {
      open: businessHoursRange.startLabel ?? fallbackOpeningHours.weekday.open,
      close: businessHoursRange.endLabel ?? fallbackOpeningHours.weekday.close,
    },
    weekend: fallbackOpeningHours.weekend ?? fallbackOpeningHours.weekday,
  }
}

function mapCastToSummary(cast: any) {
  const rawImages = Array.isArray(cast?.images)
    ? cast.images
    : cast?.images
      ? [cast.images]
      : cast?.image
        ? [cast.image]
        : []

  const images = rawImages.filter((url: unknown): url is string => typeof url === 'string' && url.length > 0)
  const primaryImage = images[0] ?? '/placeholder-user.jpg'

  return {
    id: cast?.id ?? '',
    name: cast?.name ?? '匿名キャスト',
    age: cast?.age ?? null,
    height: cast?.height ?? null,
    bust: cast?.bust ?? null,
    waist: cast?.waist ?? null,
    hip: cast?.hip ?? null,
    type: cast?.type ?? null,
    image: primaryImage,
    images: images.length > 0 ? images : [primaryImage],
    panelDesignationRank: cast?.panelDesignationRank ?? 0,
    regularDesignationRank: cast?.regularDesignationRank ?? 0,
    netReservation: cast?.netReservation ?? true,
    workStatus: cast?.workStatus ?? null,
    sizeLabel: cast?.sizeLabel ?? buildSizeLabel(cast),
  }
}

function uniqueBy<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  const result: T[] = []
  for (const item of items) {
    if (!item?.id || seen.has(item.id)) continue
    seen.add(item.id)
    result.push(item)
  }
  return result
}

function anonymizeCustomerName(name?: string | null) {
  if (!name) return '匿名'
  const trimmed = name.trim()
  if (!trimmed) return '匿名'
  const first = trimmed.charAt(0)
  return `${first}***`
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const normalizedSlug = slug?.toLowerCase()

  if (!normalizedSlug) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 })
  }

  const fallbackPayload = buildFallbackHomeData(normalizedSlug)

  try {
    const storeRecord = await db.store.findFirst({
      where: { slug: normalizedSlug },
      include: {
        storeSettings: true,
      },
    })

    if (!storeRecord) {
      if (fallbackPayload) {
        return NextResponse.json(fallbackPayload)
      }
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const fallbackStore = getFallbackStoreBySlug(normalizedSlug)
    const openingHours = normalizeOpeningHours(
      storeRecord,
      storeRecord.storeSettings,
      fallbackStore
    )

    const store = {
      id: storeRecord.id,
      slug: storeRecord.slug,
      name: storeRecord.name,
      displayName: storeRecord.displayName ?? fallbackStore?.displayName ?? storeRecord.name,
      address: storeRecord.address ?? fallbackStore?.address ?? '',
      phone: storeRecord.phone ?? fallbackStore?.phone ?? '',
      email: storeRecord.email ?? fallbackStore?.email ?? '',
      openingHours,
      location: fallbackStore?.location ?? { lat: 0, lng: 0 },
      features: fallbackStore?.features ?? [],
      images: fallbackStore?.images ?? { main: '', gallery: [] },
      theme: fallbackStore?.theme ?? null,
      seoTitle: fallbackStore?.seoTitle ?? null,
      seoDescription: fallbackStore?.seoDescription ?? null,
      isActive: storeRecord.isActive,
      createdAt: storeRecord.createdAt.toISOString(),
      updatedAt: storeRecord.updatedAt.toISOString(),
    }

    const rankingCastsRaw = await db.cast.findMany({
      where: { storeId: storeRecord.id, panelDesignationRank: { gt: 0 } },
      orderBy: [
        { panelDesignationRank: 'asc' },
        { regularDesignationRank: 'asc' },
        { createdAt: 'asc' },
      ],
      take: 8,
    })

    const newcomersRaw = await db.cast.findMany({
      where: { storeId: storeRecord.id },
      orderBy: [{ createdAt: 'desc' }],
      take: 8,
    })

    const now = new Date()
    const start = startOfDay(now)
    const end = endOfDay(now)

    let todaysSchedulesRaw = await db.castSchedule.findMany({
      where: {
        cast: { storeId: storeRecord.id },
        startTime: {
          gte: start,
          lte: end,
        },
        isAvailable: true,
      },
      include: {
        cast: true,
      },
      orderBy: [
        { startTime: 'asc' },
        { endTime: 'asc' },
      ],
      take: 12,
    })

    if (todaysSchedulesRaw.length === 0) {
      todaysSchedulesRaw = await db.castSchedule.findMany({
        where: {
          cast: { storeId: storeRecord.id },
          startTime: {
            gte: addHours(now, -3),
          },
          isAvailable: true,
        },
        include: {
          cast: true,
        },
        orderBy: [
          { startTime: 'asc' },
          { endTime: 'asc' },
        ],
        take: 12,
      })
    }

    const reviewsRaw = await db.review.findMany({
      where: {
        cast: {
          storeId: storeRecord.id,
        },
      },
      include: {
        cast: true,
        customer: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    })

    const ranking = uniqueBy(rankingCastsRaw.map(mapCastToSummary)).slice(0, 4)

    const newcomers = uniqueBy(
      newcomersRaw
        .map((cast) => ({
          ...mapCastToSummary(cast),
          netReservation: cast.netReservation ?? true,
        }))
    ).slice(0, 4)

    const todaysSchedules = uniqueBy(
      todaysSchedulesRaw.map((entry) => ({
        id: entry.castId,
        castId: entry.castId,
        castName: entry.cast?.name ?? '匿名キャスト',
        startTime: entry.startTime.toISOString(),
        endTime: entry.endTime.toISOString(),
        cast: mapCastToSummary(entry.cast),
      }))
    )
      .map(({ id, ...rest }) => rest)
      .slice(0, 6)

    const reviews = reviewsRaw.map((review) => ({
      id: review.id,
      castId: review.castId,
      castName: review.cast?.name ?? '匿名キャスト',
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
      customerAlias: anonymizeCustomerName(review.customer?.name),
      area: null,
    }))

    const customBanners = await db.storeEventBanner.findMany({
      where: { storeId: storeRecord.id, isActive: true },
      orderBy: { displayOrder: 'asc' },
      take: 10,
    })

    const banners = (customBanners.length > 0
      ? customBanners.map((banner) => ({
          id: banner.id,
          title: banner.title,
          imageUrl: banner.imageUrl,
          mobileImageUrl: banner.mobileImageUrl ?? banner.imageUrl,
          link: banner.link ?? `/${store.slug}/pricing`,
        }))
      : (() => {
          const bannerSources = ranking.length > 0 ? ranking : newcomers
          return bannerSources.slice(0, 3).map((cast) => ({
            id: `banner-${cast.id}`,
            title: `${cast.name} 最新情報`,
            imageUrl: cast.image ?? '/placeholder-user.jpg',
            mobileImageUrl: cast.image ?? '/placeholder-user.jpg',
            link: `/${store.slug}/cast/${cast.id}`,
          }))
        })())

    return NextResponse.json({
      store,
      banners,
      highlights: {
        ranking,
        newcomers,
        todaysSchedules,
      },
      reviews,
    })
  } catch (error) {
    logger.error({ err: error, slug: normalizedSlug }, 'Failed to build public store payload')
    if (fallbackPayload) {
      return NextResponse.json(fallbackPayload)
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
