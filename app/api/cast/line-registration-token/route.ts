/**
 * @design_doc   Store-scoped admin endpoint for one-time LINE cast registration credentials
 * @related_to   lib/line/cast-registration-token.ts, lib/auth/utils.ts
 * @known_issues The raw credential is returned only in the successful creation response
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth/config'
import { requireAdmin } from '@/lib/auth/utils'
import {
  CastLineRegistrationTokenError,
  issueCastLineRegistrationToken,
  unlinkCastLineRegistration,
} from '@/lib/line/cast-registration-token'
import logger from '@/lib/logger'
import { ensureStoreId, resolveStoreId } from '@/lib/store/server'

const requestSchema = z.object({ castId: z.string().trim().min(1).max(128) }).strict()

export async function POST(request: NextRequest) {
  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const authError = await requireAdmin({ permissions: 'cast:update', storeId })
    if (authError) return authError

    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const input = requestSchema.parse(await request.json())
    const issued = await issueCastLineRegistrationToken({
      castId: input.castId,
      storeId,
      createdByAdminId: session.user.id,
    })

    return NextResponse.json(
      {
        token: issued.token,
        command: `reg ${issued.token}`,
        expiresAt: issued.expiresAt.toISOString(),
      },
      { status: 201, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    if (error instanceof CastLineRegistrationTokenError) {
      if (error.code === 'cast_not_found') {
        return NextResponse.json({ error: 'Cast not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Cast is already linked to LINE' }, { status: 409 })
    }

    logger.error({ err: error }, 'Failed to issue LINE cast registration token')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const authError = await requireAdmin({ permissions: 'cast:update', storeId })
    if (authError) return authError

    const input = requestSchema.parse(await request.json())
    await unlinkCastLineRegistration({ castId: input.castId, storeId })

    return NextResponse.json(
      { success: true },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    if (error instanceof CastLineRegistrationTokenError) {
      return NextResponse.json({ error: 'Cast not found' }, { status: 404 })
    }

    logger.error({ err: error }, 'Failed to unlink LINE cast registration')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
