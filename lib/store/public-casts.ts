import { differenceInDays } from 'date-fns'
import { db } from '@/lib/db'
import type { PublicCastSummary } from '@/lib/store/public-types'
import { normalizeCast } from '@/lib/cast/mapper'
import type { Cast } from '@/lib/cast/types'

interface CastRecord {
  id: string
  name: string
  age: number | null
  height: number | null
  bust: string | null
  waist: number | null
  hip: number | null
  type: string | null
  image: string | null
  images: string[] | null
  netReservation: boolean | null
  panelDesignationRank: number | null
  regularDesignationRank: number | null
  workStatus: string | null
  createdAt: Date
  publicProfile: any | null
}

function normalizeImages(record: CastRecord) {
  const raw = Array.isArray(record.images)
    ? record.images
    : typeof record.images === 'string'
      ? [record.images]
      : record.image
        ? [record.image]
        : []
  const cleaned = raw.filter((url) => typeof url === 'string' && url.length > 0)
  const primary = cleaned[0] ?? '/placeholder-user.jpg'
  return { primary, all: cleaned.length > 0 ? cleaned : [primary] }
}

function buildSizeLabel(record: CastRecord) {
  const parts = [
    record.height ? `T${record.height}` : null,
    record.bust ? `B${record.bust}` : null,
    record.waist ? `W${record.waist}` : null,
    record.hip ? `H${record.hip}` : null,
  ].filter(Boolean)
  return parts.join(' ')
}

export interface PublicCastProfile extends PublicCastSummary {
  createdAt: string
  availableServices: string[]
  introMessage: string | null
  personalityTags: string[]
}

export async function getPublicCastProfiles(storeId: string): Promise<PublicCastProfile[]> {
  const castRecords: CastRecord[] = await db.cast.findMany({
    where: { storeId },
    select: {
      id: true,
      name: true,
      age: true,
      height: true,
      bust: true,
      waist: true,
      hip: true,
      type: true,
      image: true,
      images: true,
      netReservation: true,
      panelDesignationRank: true,
      regularDesignationRank: true,
      workStatus: true,
      createdAt: true,
      publicProfile: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return castRecords.map((record) => {
    const { primary, all } = normalizeImages(record)
    const profile = record.publicProfile ?? {}
    const availableServices = Array.isArray(profile.availableServices)
      ? profile.availableServices.filter((service: unknown) => typeof service === 'string')
      : []
    const personalityTags = Array.isArray(profile.personality)
      ? profile.personality.filter((tag: unknown) => typeof tag === 'string')
      : []
    const introMessage =
      (typeof profile.customerMessage === 'string' && profile.customerMessage.trim().length > 0
        ? profile.customerMessage
        : typeof profile.shopMessage === 'string' && profile.shopMessage.trim().length > 0
          ? profile.shopMessage
          : null)

    return {
      id: record.id,
      name: record.name,
      age: record.age ?? null,
      height: record.height ?? null,
      bust: record.bust ?? null,
      waist: record.waist ?? null,
      hip: record.hip ?? null,
      type: record.type ?? null,
      image: primary,
      images: all,
      panelDesignationRank: record.panelDesignationRank ?? 0,
      regularDesignationRank: record.regularDesignationRank ?? 0,
      netReservation: Boolean(record.netReservation ?? true),
      workStatus: record.workStatus ?? null,
      sizeLabel: buildSizeLabel(record),
      createdAt: record.createdAt.toISOString(),
      availableServices,
      introMessage,
      personalityTags,
    }
  })
}

export interface PublicRankingEntry {
  cast: PublicCastProfile
  score: number
  label: string
  trend?: 'up' | 'down' | 'same'
}

export interface PublicReviewEntry {
  cast: PublicCastProfile
  rating: number
  reviewCount: number
}

export interface PublicRepeatEntry {
  cast: PublicCastProfile
  reservationCount: number
}

export interface PublicRankingData {
  overall: PublicRankingEntry[]
  newcomers: PublicRankingEntry[]
  reviews: PublicReviewEntry[]
  repeaters: PublicRepeatEntry[]
}

export async function getPublicRankingData(storeId: string): Promise<PublicRankingData> {
  const profiles = await getPublicCastProfiles(storeId)
  if (profiles.length === 0) {
    return { overall: [], newcomers: [], reviews: [], repeaters: [] }
  }

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]))

  const reviewStats = await db.review.groupBy({
    by: ['castId'],
    where: { cast: { storeId } },
    _avg: { rating: true },
    _count: { _all: true },
  })

  const reservationStats = await db.reservation.groupBy({
    by: ['castId'],
    where: { storeId },
    _count: { _all: true },
  })

  const reservationsMap = new Map(reservationStats.map((stat) => [stat.castId, stat._count._all]))

  const panelRanked = profiles
    .filter((profile) => profile.panelDesignationRank && profile.panelDesignationRank > 0)
    .sort((a, b) => (a.panelDesignationRank ?? 0) - (b.panelDesignationRank ?? 0))

  const fallbackOverall = [...profiles].sort((a, b) => {
    const aCount = reservationsMap.get(a.id) ?? 0
    const bCount = reservationsMap.get(b.id) ?? 0
    if (bCount !== aCount) return bCount - aCount
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const overallSource = panelRanked.length > 0 ? panelRanked : fallbackOverall

  const overall = overallSource.slice(0, 5).map((profile, index) => ({
    cast: profile,
    score: profile.panelDesignationRank && profile.panelDesignationRank > 0 ? profile.panelDesignationRank : (reservationsMap.get(profile.id) ?? 0),
    label:
      profile.panelDesignationRank && profile.panelDesignationRank > 0
        ? `指名順位 ${profile.panelDesignationRank}`
        : `予約数 ${reservationsMap.get(profile.id) ?? 0}`,
    trend: (index === 0 ? 'up' : 'same') as PublicRankingEntry['trend'],
  }))

  const newcomers = [...profiles]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map((profile, index) => ({
      cast: profile,
      score: index + 1,
      label: `入店${differenceInDays(new Date(), new Date(profile.createdAt))}日` ,
    }))

  const reviews = reviewStats
    .map((stat) => {
      const cast = profileMap.get(stat.castId)
      if (!cast) return null
      return {
        cast,
        rating: Number(stat._avg.rating?.toFixed(1) ?? 0),
        reviewCount: stat._count._all,
      }
    })
    .filter((entry): entry is PublicReviewEntry => entry !== null)
    .sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating
      return b.reviewCount - a.reviewCount
    })
    .slice(0, 5)

  const repeaters = reservationStats
    .map((stat) => {
      const cast = profileMap.get(stat.castId)
      if (!cast) return null
      return {
        cast,
        reservationCount: stat._count._all,
      }
    })
    .filter((entry): entry is PublicRepeatEntry => entry !== null)
    .sort((a, b) => b.reservationCount - a.reservationCount)
    .slice(0, 5)

  return {
    overall,
    newcomers,
    reviews,
    repeaters,
  }
}

export interface PublicRecruitmentEntry {
  cast: PublicCastProfile
  daysSinceJoin: number
}

export interface PublicRecruitmentData {
  newcomers: PublicRecruitmentEntry[]
  graduates: PublicRecruitmentEntry[]
}

export async function getPublicRecruitmentData(storeId: string): Promise<PublicRecruitmentData> {
  const profiles = await getPublicCastProfiles(storeId)
  const today = new Date()

  const newcomers = profiles
    .map((cast) => ({
      cast,
      daysSinceJoin: differenceInDays(today, new Date(cast.createdAt)),
    }))
    .sort((a, b) => a.daysSinceJoin - b.daysSinceJoin)
    .filter((entry) => entry.daysSinceJoin <= 45)

  const graduates = profiles
    .map((cast) => ({
      cast,
      daysSinceJoin: differenceInDays(today, new Date(cast.createdAt)),
    }))
    .sort((a, b) => a.daysSinceJoin - b.daysSinceJoin)
    .filter((entry) => entry.daysSinceJoin > 45 && entry.daysSinceJoin <= 120)

  return {
    newcomers: newcomers.slice(0, 6),
    graduates: graduates.slice(0, 6),
  }
}

export async function getPublicCastDetail(
  storeId: string,
  castId: string
): Promise<Cast | null> {
  const record = await db.cast.findFirst({
    where: { id: castId, storeId },
    include: {
      reservations: {
        include: {
          customer: true,
          course: true,
          options: {
            include: {
              option: true,
            },
          },
        },
      },
    },
  })

  if (!record) {
    return null
  }

  return normalizeCast(record)
}
