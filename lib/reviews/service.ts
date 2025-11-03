import { Prisma, ReviewStatus as PrismaReviewStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { RESERVATION_STATUS } from '@/lib/constants'
import type { Review, ReviewStats, ReviewStatus } from './types'
import { calculateReviewStats } from './utils'

const reviewDefaultInclude = {
  cast: {
    select: {
      id: true,
      name: true,
      storeId: true,
    },
  },
  customer: {
    select: {
      id: true,
      name: true,
    },
  },
  reservation: {
    select: {
      id: true,
      storeId: true,
      customerId: true,
      startTime: true,
      endTime: true,
      status: true,
      course: {
        select: {
          name: true,
        },
      },
      options: {
        select: {
          optionName: true,
          option: {
            select: {
              name: true,
            },
          },
        },
      },
      area: {
        select: {
          name: true,
        },
      },
    },
  },
} as const

const REVIEW_STATUS_VALUES: ReviewStatus[] = ['pending', 'published', 'hidden']

type PrismaReviewWithRelations = Prisma.ReviewGetPayload<{
  include: typeof reviewDefaultInclude
}>;

export type ReviewServiceErrorCode =
  | 'RESERVATION_NOT_FOUND'
  | 'REVIEW_NOT_FOUND'
  | 'FORBIDDEN'
  | 'RESERVATION_NOT_COMPLETED'
  | 'REVIEW_ALREADY_EXISTS'
  | 'INVALID_STATUS'

export class ReviewServiceError extends Error {
  constructor(public code: ReviewServiceErrorCode, message: string) {
    super(message)
    this.name = 'ReviewServiceError'
  }
}

function buildCustomerAlias(name?: string | null): string {
  if (!name || name.trim().length === 0) {
    return '匿名会員'
  }

  const trimmed = name.trim()
  const firstChar = trimmed.charAt(0)
  return `${firstChar}***`
}

type ReservationOptionLite = {
  optionName: string | null
  option: {
    name: string | null
  } | null
}

function normalizeOptions(options?: ReservationOptionLite[] | null): string[] {
  if (!options || options.length === 0) return []
  return options
    .map((option) => option.optionName ?? option.option?.name ?? null)
    .filter((option): option is string => Boolean(option))
}

function mapReview(record: PrismaReviewWithRelations): Review {
  const reservation = record.reservation
  const storeId = reservation?.storeId ?? record.cast.storeId
  const visitDate = reservation?.endTime ?? reservation?.startTime ?? record.createdAt
  const options = normalizeOptions(reservation?.options)
  const courseName = reservation?.course?.name ?? null
  const areaName = reservation?.area?.name ?? null
  const customerName = record.customer?.name ?? null

  return {
    id: record.id,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    storeId,
    reservationId: record.reservationId,
    castId: record.castId,
    castName: record.cast.name,
    customerId: record.customerId,
    customerName,
    customerAlias: buildCustomerAlias(customerName),
    customerArea: areaName,
    rating: record.rating,
    comment: record.comment ?? '',
    visitDate,
    courseName,
    options,
    isVerified: reservation?.status === RESERVATION_STATUS.COMPLETED,
    helpful: 0,
    tags: [],
    status: record.status as ReviewStatus,
    publishedAt: record.publishedAt,
  }
}

function ensureValidStatuses(statuses?: ReviewStatus[]): PrismaReviewStatus[] | undefined {
  if (!statuses || statuses.length === 0) {
    return undefined
  }

  const normalized = statuses.filter((status) => REVIEW_STATUS_VALUES.includes(status))
  if (normalized.length === 0) {
    throw new ReviewServiceError('INVALID_STATUS', 'Unsupported review status specified')
  }

  return normalized as PrismaReviewStatus[]
}

export interface ReviewQueryFilters {
  storeId?: string
  statuses?: ReviewStatus[]
  castId?: string
  customerId?: string
  reservationId?: string
  limit?: number
}

export async function searchReviews(filters: ReviewQueryFilters): Promise<Review[]> {
  const statusFilter = ensureValidStatuses(filters.statuses)

  const where: Prisma.ReviewWhereInput = {
    cast: filters.storeId
      ? {
          storeId: filters.storeId,
        }
      : undefined,
  }

  if (statusFilter) {
    where.status = { in: statusFilter }
  }

  if (filters.castId) {
    where.castId = filters.castId
  }

  if (filters.customerId) {
    where.customerId = filters.customerId
  }

  if (filters.reservationId) {
    where.reservationId = filters.reservationId
  }

  const reviews = await db.review.findMany({
    where,
    include: reviewDefaultInclude,
    orderBy: {
      createdAt: 'desc',
    },
    take: filters.limit,
  })

  return reviews.map(mapReview)
}

export async function getStoreReviews(
  storeId: string,
  options?: Omit<ReviewQueryFilters, 'storeId'>
): Promise<Review[]> {
  return searchReviews({ ...options, storeId })
}

export async function getReviewById(id: string): Promise<Review | null> {
  const review = await db.review.findUnique({
    where: { id },
    include: reviewDefaultInclude,
  })

  if (!review) {
    return null
  }

  return mapReview(review)
}

export async function getReviewStatsForStore(
  storeId: string,
  statuses?: ReviewStatus[]
): Promise<ReviewStats> {
  const reviews = await getStoreReviews(storeId, { statuses })
  return calculateReviewStats(reviews)
}

export interface CreateReviewParams {
  reservationId: string
  rating: number
  comment: string
  actorId: string
  actorRole: 'admin' | 'customer' | 'staff'
  status?: ReviewStatus
}

export async function createReview(params: CreateReviewParams): Promise<Review> {
  const reservation = await db.reservation.findUnique({
    where: { id: params.reservationId },
    include: {
      cast: {
        select: {
          id: true,
        },
      },
      reviews: {
        select: {
          id: true,
        },
      },
    },
  })

  if (!reservation) {
    throw new ReviewServiceError('RESERVATION_NOT_FOUND', 'Reservation not found')
  }

  const isAdmin = params.actorRole === 'admin'

  if (!isAdmin && reservation.customerId !== params.actorId) {
    throw new ReviewServiceError('FORBIDDEN', 'You can only review your own reservations')
  }

  if (reservation.status !== RESERVATION_STATUS.COMPLETED) {
    throw new ReviewServiceError('RESERVATION_NOT_COMPLETED', 'Reservation is not complete yet')
  }

  if (reservation.reviews.length > 0) {
    throw new ReviewServiceError(
      'REVIEW_ALREADY_EXISTS',
      'A review has already been submitted for this reservation'
    )
  }

  const desiredStatus = params.status && isAdmin ? params.status : 'pending'
  const statusToPersist = ensureValidStatuses([desiredStatus])![0]

  const review = await db.review.create({
    data: {
      customerId: reservation.customerId,
      castId: reservation.castId,
      reservationId: reservation.id,
      rating: params.rating,
      comment: params.comment,
      status: statusToPersist,
      publishedAt: statusToPersist === 'published' ? new Date() : null,
    },
    include: reviewDefaultInclude,
  })

  return mapReview(review)
}

export interface UpdateReviewParams {
  id: string
  actorId: string
  actorRole: 'admin' | 'customer' | 'staff'
  rating?: number
  comment?: string
  status?: ReviewStatus
}

export async function updateReview(params: UpdateReviewParams): Promise<Review> {
  const existing = await db.review.findUnique({
    where: { id: params.id },
    include: reviewDefaultInclude,
  })

  if (!existing) {
    throw new ReviewServiceError('REVIEW_NOT_FOUND', 'Review not found')
  }

  const isAdmin = params.actorRole === 'admin'
  if (!isAdmin && existing.customerId !== params.actorId) {
    throw new ReviewServiceError('FORBIDDEN', 'You can only update your own reviews')
  }

  const data: Prisma.ReviewUpdateInput = {}

  if (params.rating !== undefined) {
    data.rating = params.rating
  }

  if (params.comment !== undefined) {
    data.comment = params.comment
  }

  if (params.status !== undefined) {
    if (!isAdmin) {
      throw new ReviewServiceError('FORBIDDEN', 'Only administrators can change review status')
    }
    const normalized = ensureValidStatuses([params.status])![0]
    data.status = normalized
    data.publishedAt = normalized === 'published' ? existing.publishedAt ?? new Date() : null
  }

  if (Object.keys(data).length === 0) {
    return mapReview(existing)
  }

  const updated = await db.review.update({
    where: { id: params.id },
    data,
    include: reviewDefaultInclude,
  })

  return mapReview(updated)
}

export interface DeleteReviewParams {
  id: string
  actorId: string
  actorRole: 'admin' | 'customer' | 'staff'
}

export async function deleteReview(params: DeleteReviewParams): Promise<void> {
  const existing = await db.review.findUnique({
    where: { id: params.id },
  })

  if (!existing) {
    throw new ReviewServiceError('REVIEW_NOT_FOUND', 'Review not found')
  }

  const isAdmin = params.actorRole === 'admin'
  if (!isAdmin && existing.customerId !== params.actorId) {
    throw new ReviewServiceError('FORBIDDEN', 'You can only delete your own reviews')
  }

  await db.review.delete({
    where: { id: params.id },
  })
}

export interface EligibleReservation {
  id: string
  storeId: string
  castId: string
  castName: string
  courseName?: string | null
  startTime: Date
  endTime: Date
}

export async function getEligibleReservationsForCustomer(
  customerId: string,
  storeId?: string
): Promise<EligibleReservation[]> {
  const where: Prisma.ReservationWhereInput = {
    customerId,
    status: RESERVATION_STATUS.COMPLETED,
    reviews: {
      none: {
        customerId,
      },
    },
  }

  if (storeId) {
    where.storeId = storeId
  }

  const reservations = await db.reservation.findMany({
    where,
    include: {
      cast: {
        select: {
          id: true,
          name: true,
        },
      },
      course: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      startTime: 'desc',
    },
  })

  return reservations.map((reservation) => ({
    id: reservation.id,
    storeId: reservation.storeId,
    castId: reservation.castId,
    castName: reservation.cast?.name ?? '担当キャスト',
    courseName: reservation.course?.name ?? null,
    startTime: reservation.startTime,
    endTime: reservation.endTime,
  }))
}
