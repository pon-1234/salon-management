/**
 * @design_doc   Public storefront cast projections expose only explicitly approved profile data
 * @related_to   Public cast listing, ranking, recruitment, and detail pages
 * @known_issues None
 */
import { differenceInDays } from 'date-fns'
import { db } from '@/lib/db'
import type { PublicCastSummary } from '@/lib/store/public-types'
import type { PublicProfile } from '@/lib/cast/types'
import { normalizePublicProfile } from '@/lib/cast/public-profile'
import logger from '@/lib/logger'

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
  specialDesignationFee: number | null
  specialDesignationFeeTier?: { name: string } | null
  panelTakeHomeBonusTier?: { name: string; price: number } | null
  regularTakeHomeBonusTier?: { name: string; price: number } | null
  workStatus: string | null
  createdAt: Date
  publicProfile: any | null
}

function normalizeImages(record: Pick<CastRecord, 'image' | 'images'>) {
  const raw = Array.isArray(record.images)
    ? record.images
    : typeof record.images === 'string'
      ? [record.images]
      : record.image
        ? [record.image]
        : []
  const cleaned = raw.filter((url) => typeof url === 'string' && url.length > 0)
  const primary = cleaned[0] ?? '/images/non-photo.svg'
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
  let castRecords: CastRecord[]
  try {
    castRecords = await db.cast.findMany({
      where: { storeId, employmentStatus: 'active' },
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
        specialDesignationFee: true,
        specialDesignationFeeTier: { select: { name: true } },
        panelTakeHomeBonusTier: { select: { name: true, price: true } },
        regularTakeHomeBonusTier: { select: { name: true, price: true } },
        workStatus: true,
        createdAt: true,
        publicProfile: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  } catch (error) {
    logger.error({ err: error, storeId }, 'Failed to load public cast profiles')
    return []
  }

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
      typeof profile.customerMessage === 'string' && profile.customerMessage.trim().length > 0
        ? profile.customerMessage
        : typeof profile.shopMessage === 'string' && profile.shopMessage.trim().length > 0
          ? profile.shopMessage
          : null

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
      specialDesignationFee: record.specialDesignationFee ?? 0,
      specialDesignationFeeLabel: record.specialDesignationFeeTier?.name ?? null,
      panelTakeHomeBonus: record.panelTakeHomeBonusTier?.price ?? 0,
      panelTakeHomeBonusLabel: record.panelTakeHomeBonusTier?.name ?? null,
      regularTakeHomeBonus: record.regularTakeHomeBonusTier?.price ?? 0,
      regularTakeHomeBonusLabel: record.regularTakeHomeBonusTier?.name ?? null,
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

  let reviewStats
  let reservationStats
  try {
    ;[reviewStats, reservationStats] = await Promise.all([
      db.review.groupBy({
        by: ['castId'],
        where: { cast: { storeId } },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      db.reservation.groupBy({
        by: ['castId'],
        where: { storeId, cast: { employmentStatus: 'active' } },
        _count: { _all: true },
      }),
    ])
  } catch (error) {
    logger.error({ err: error, storeId }, 'Failed to load public ranking aggregates')
    return { overall: [], newcomers: [], reviews: [], repeaters: [] }
  }

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
    score:
      profile.panelDesignationRank && profile.panelDesignationRank > 0
        ? profile.panelDesignationRank
        : (reservationsMap.get(profile.id) ?? 0),
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
      label: `入店${differenceInDays(new Date(), new Date(profile.createdAt))}日`,
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

export interface PublicCastDetail {
  id: string
  name: string
  age: number
  height: number
  bust: string
  waist: number
  hip: number
  type: string
  image: string
  images: string[]
  description: string
  netReservation: boolean
  requestAttendanceEnabled: boolean
  panelDesignationRank: number
  regularDesignationRank: number
  specialDesignationFee: number
  specialDesignationFeeLabel: string | null
  panelTakeHomeBonus: number
  panelTakeHomeBonusLabel: string | null
  regularTakeHomeBonus: number
  regularTakeHomeBonusLabel: string | null
  workStatus: string
  workStart?: Date
  workEnd?: Date
  availableOptions: string[]
  availableOptionSettings: Array<{
    optionId: string
    visibility: 'public'
  }>
  availableOptionDetails: Array<{
    id: string
    name: string
    description: string | null
    price: number
    note: string | null
  }>
  publicProfile: PublicProfile | null
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
): Promise<PublicCastDetail | null> {
  const record = await db.cast.findFirst({
    where: { id: castId, storeId, employmentStatus: 'active' },
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
      description: true,
      netReservation: true,
      requestAttendanceEnabled: true,
      panelDesignationRank: true,
      regularDesignationRank: true,
      specialDesignationFee: true,
      specialDesignationFeeTier: { select: { name: true } },
      panelTakeHomeBonusTier: { select: { name: true, price: true } },
      regularTakeHomeBonusTier: { select: { name: true, price: true } },
      workStatus: true,
      availableOptions: true,
      publicProfile: true,
      castOptionSettings: {
        where: {
          visibility: 'public',
          option: {
            is: { storeId, isActive: true, visibility: 'public', archivedAt: null },
          },
        },
        select: {
          optionId: true,
          visibility: true,
          option: {
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              note: true,
            },
          },
        },
      },
    },
  })

  if (!record) {
    return null
  }

  const { primary, all } = normalizeImages(record)
  const availableOptionSettings = record.castOptionSettings
    .filter((setting) => setting.visibility === 'public')
    .map((setting) => ({ optionId: setting.optionId, visibility: 'public' as const }))
  const availableOptions =
    availableOptionSettings.length > 0
      ? availableOptionSettings.map((setting) => setting.optionId)
      : record.availableOptions.filter((optionId) => typeof optionId === 'string' && optionId)
  const fallbackOptionDetails =
    availableOptionSettings.length === 0 && availableOptions.length > 0
      ? await db.optionPrice.findMany({
          where: {
            id: { in: availableOptions },
            storeId,
            isActive: true,
            visibility: 'public',
            archivedAt: null,
          },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            note: true,
          },
          orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        })
      : []
  const availableOptionDetails =
    availableOptionSettings.length > 0
      ? record.castOptionSettings
          .filter((setting) => setting.visibility === 'public')
          .map((setting) => setting.option)
      : fallbackOptionDetails

  return {
    id: record.id,
    name: record.name,
    age: record.age,
    height: record.height,
    bust: record.bust,
    waist: record.waist,
    hip: record.hip,
    type: record.type,
    image: primary,
    images: all,
    description: record.description,
    netReservation: record.netReservation,
    requestAttendanceEnabled: record.requestAttendanceEnabled,
    panelDesignationRank: record.panelDesignationRank,
    regularDesignationRank: record.regularDesignationRank,
    specialDesignationFee: record.specialDesignationFee ?? 0,
    specialDesignationFeeLabel: record.specialDesignationFeeTier?.name ?? null,
    panelTakeHomeBonus: record.panelTakeHomeBonusTier?.price ?? 0,
    panelTakeHomeBonusLabel: record.panelTakeHomeBonusTier?.name ?? null,
    regularTakeHomeBonus: record.regularTakeHomeBonusTier?.price ?? 0,
    regularTakeHomeBonusLabel: record.regularTakeHomeBonusTier?.name ?? null,
    workStatus: record.workStatus,
    workStart: undefined,
    workEnd: undefined,
    availableOptions,
    availableOptionSettings,
    availableOptionDetails,
    publicProfile: normalizePublicProfile(record.publicProfile),
  }
}
