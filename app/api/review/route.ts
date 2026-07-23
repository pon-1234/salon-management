/**
 * @design_doc   Review API endpoints for CRUD operations
 * @related_to   Review service layer, Prisma Review model
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth/config'
import { canAdminAccessStore } from '@/lib/auth/store-access'
import logger from '@/lib/logger'
import { toPublicReview } from '@/lib/reviews/public'
import {
  searchReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview as removeReview,
  ReviewServiceError,
  getReviewStatsForStore,
} from '@/lib/reviews/service'
import type { ReviewStatus } from '@/lib/reviews/types'

type AppSession =
  | (Awaited<ReturnType<typeof getServerSession>> & {
      user?: {
        id?: string
        role?: string
        name?: string
        adminRole?: string
        permissions?: string[]
        storeIds?: string[]
      }
    })
  | null

const reviewStatusSchema = z.enum(['pending', 'published', 'hidden'])

const createReviewSchema = z.object({
  reservationId: z.string().min(1, 'reservationId is required'),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().min(1).max(2000),
  status: reviewStatusSchema.optional(),
})

const updateReviewSchema = z
  .object({
    id: z.string().min(1, 'id is required'),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    comment: z.string().min(1).max(2000).optional(),
    status: reviewStatusSchema.optional(),
  })
  .refine(
    (payload) =>
      payload.rating !== undefined || payload.comment !== undefined || payload.status !== undefined,
    {
      message: 'At least one field (rating, comment, status) must be provided',
    }
  )

function parseStatusParam(param: string | null): ReviewStatus[] | undefined {
  if (!param) return undefined

  const rawStatuses = param
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  if (rawStatuses.length === 0) {
    return undefined
  }

  if (rawStatuses.includes('all')) {
    return undefined
  }

  const statuses = rawStatuses
    .map((value) => {
      const result = reviewStatusSchema.safeParse(value)
      return result.success ? result.data : null
    })
    .filter((value): value is ReviewStatus => value !== null)

  return statuses.length > 0 ? Array.from(new Set(statuses)) : undefined
}

function resolveActorRole(session: AppSession): 'admin' | 'customer' | 'staff' {
  const role = session?.user?.role
  if (role === 'admin') return 'admin'
  if (role === 'customer') return 'customer'
  return 'staff'
}

function resolveRequiredStoreId(request: NextRequest): string | null {
  const storeId = request.nextUrl.searchParams.get('storeId')?.trim()
  return storeId || null
}

function storeIdRequiredResponse() {
  return NextResponse.json({ error: 'storeId is required' }, { status: 400 })
}

function adminStoreAccessResponse(session: AppSession, storeId: string) {
  if (resolveActorRole(session) !== 'admin') {
    return null
  }

  if (!session?.user || !canAdminAccessStore(session.user, storeId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return null
}

function resolveStatusesForAudience(
  requested: ReviewStatus[] | undefined,
  actorRole: 'admin' | 'customer' | 'staff',
  session: AppSession,
  targetCustomerId?: string | null
): ReviewStatus[] | undefined {
  const isAdmin = actorRole === 'admin'
  const isOwner =
    actorRole === 'customer' && targetCustomerId && session?.user?.id === targetCustomerId

  if (isAdmin) {
    return requested
  }

  if (isOwner) {
    return requested
  }

  const fallback: ReviewStatus[] = ['published']

  if (!requested || requested.length === 0) {
    return fallback
  }

  const filtered = requested.filter((status) => status === 'published')
  return filtered.length > 0 ? filtered : fallback
}

function mapServiceErrorToResponse(error: ReviewServiceError) {
  switch (error.code) {
    case 'RESERVATION_NOT_FOUND':
      return NextResponse.json({ error: '予約が見つかりませんでした' }, { status: 404 })
    case 'REVIEW_NOT_FOUND':
      return NextResponse.json({ error: '口コミが見つかりませんでした' }, { status: 404 })
    case 'FORBIDDEN':
      return NextResponse.json({ error: '操作する権限がありません' }, { status: 403 })
    case 'RESERVATION_NOT_COMPLETED':
      return NextResponse.json({ error: '施術完了後のみ投稿できます' }, { status: 400 })
    case 'REVIEW_ALREADY_EXISTS':
      return NextResponse.json({ error: 'この予約には既に口コミが存在します' }, { status: 409 })
    case 'INVALID_STATUS':
      return NextResponse.json({ error: '無効なステータスです' }, { status: 400 })
    default:
      return NextResponse.json({ error: '内部エラーが発生しました' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as AppSession
    const actorRole = resolveActorRole(session)
    const searchParams = request.nextUrl.searchParams

    const id = searchParams.get('id')
    const storeId = searchParams.get('storeId')?.trim() || null
    const castId = searchParams.get('castId')
    const customerId = searchParams.get('customerId')
    const reservationId = searchParams.get('reservationId')
    const limitParam = searchParams.get('limit')
    const statusParam = searchParams.get('status')
    const includeStats = searchParams.get('stats') === 'true'

    if (actorRole === 'admin') {
      if (!storeId) {
        return storeIdRequiredResponse()
      }
      const accessError = adminStoreAccessResponse(session, storeId)
      if (accessError) {
        return accessError
      }
    }

    if (customerId && actorRole !== 'admin' && session?.user?.id !== customerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (id) {
      if (!storeId) {
        return storeIdRequiredResponse()
      }

      const review = await getReviewById(id, storeId)
      if (!review) {
        return NextResponse.json({ error: 'Review not found' }, { status: 404 })
      }

      const isOwner = session?.user?.id === review.customerId
      const isAdmin = actorRole === 'admin'
      if (!isAdmin && !isOwner && review.status !== 'published') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      return NextResponse.json(isAdmin || isOwner ? review : toPublicReview(review))
    }

    const requestedStatuses = parseStatusParam(statusParam)
    const effectiveStatuses = resolveStatusesForAudience(
      requestedStatuses,
      actorRole,
      session,
      customerId
    )
    const limit = limitParam ? Math.max(1, Math.min(100, Number(limitParam))) : undefined

    const filters = {
      storeId: storeId ?? undefined,
      castId: castId ?? undefined,
      customerId: customerId ?? undefined,
      reservationId: reservationId ?? undefined,
      statuses: effectiveStatuses,
      limit,
    }

    const reviews = await searchReviews(filters)
    const isOwnerList =
      actorRole === 'customer' && Boolean(customerId) && session?.user?.id === customerId
    const responseReviews =
      actorRole === 'admin' || isOwnerList ? reviews : reviews.map(toPublicReview)

    if (includeStats && storeId) {
      const stats = await getReviewStatsForStore(storeId, effectiveStatuses)
      return NextResponse.json({ reviews: responseReviews, stats })
    }

    return NextResponse.json(responseReviews)
  } catch (error) {
    logger.error({ err: error }, 'Error fetching review data')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as AppSession
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const actorRole = resolveActorRole(session)
    if (actorRole === 'staff') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const storeId = resolveRequiredStoreId(request)
    if (!storeId) {
      return storeIdRequiredResponse()
    }
    const accessError = adminStoreAccessResponse(session, storeId)
    if (accessError) {
      return accessError
    }

    const payload = createReviewSchema.safeParse(await request.json())
    if (!payload.success) {
      return NextResponse.json(
        { error: payload.error.issues[0]?.message ?? 'Invalid payload' },
        { status: 400 }
      )
    }

    try {
      const actorId = session.user?.id
      if (!actorId) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }

      const review = await createReview({
        storeId,
        reservationId: payload.data.reservationId,
        rating: payload.data.rating,
        comment: payload.data.comment,
        status: payload.data.status,
        actorId,
        actorRole,
      })

      return NextResponse.json(review, { status: 201 })
    } catch (error) {
      if (error instanceof ReviewServiceError) {
        return mapServiceErrorToResponse(error)
      }
      throw error
    }
  } catch (error) {
    logger.error({ err: error }, 'Error creating review')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as AppSession
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const actorRole = resolveActorRole(session)
    if (actorRole === 'staff') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const storeId = resolveRequiredStoreId(request)
    if (!storeId) {
      return storeIdRequiredResponse()
    }
    const accessError = adminStoreAccessResponse(session, storeId)
    if (accessError) {
      return accessError
    }

    const payload = updateReviewSchema.safeParse(await request.json())
    if (!payload.success) {
      return NextResponse.json(
        { error: payload.error.issues[0]?.message ?? 'Invalid payload' },
        { status: 400 }
      )
    }

    try {
      const actorId = session.user?.id
      if (!actorId) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }

      const updated = await updateReview({
        id: payload.data.id,
        storeId,
        rating: payload.data.rating,
        comment: payload.data.comment,
        status: payload.data.status,
        actorId,
        actorRole,
      })

      return NextResponse.json(updated)
    } catch (error) {
      if (error instanceof ReviewServiceError) {
        return mapServiceErrorToResponse(error)
      }
      throw error
    }
  } catch (error) {
    logger.error({ err: error }, 'Error updating review')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as AppSession
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const actorRole = resolveActorRole(session)
    if (actorRole === 'staff') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const storeId = resolveRequiredStoreId(request)
    if (!storeId) {
      return storeIdRequiredResponse()
    }
    const accessError = adminStoreAccessResponse(session, storeId)
    if (accessError) {
      return accessError
    }

    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    try {
      const actorId = session.user?.id
      if (!actorId) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }

      await removeReview({
        id,
        storeId,
        actorId,
        actorRole,
      })
      return new NextResponse(null, { status: 204 })
    } catch (error) {
      if (error instanceof ReviewServiceError) {
        return mapServiceErrorToResponse(error)
      }
      throw error
    }
  } catch (error) {
    logger.error({ err: error }, 'Error deleting review')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
