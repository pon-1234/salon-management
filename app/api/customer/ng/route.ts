/**
 * @design_doc   Store-scoped customer NG-cast authorization boundary
 * @related_to   requireAdmin, CustomerStoreAssignment, Cast.storeId, NgCastEntry
 * @known_issues None
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import logger from '@/lib/logger'
import { ensureStoreId, resolveStoreId } from '@/lib/store/server'

const assignmentSourceSchema = z.enum(['customer', 'cast', 'staff'])

const upsertSchema = z.object({
  customerId: z.string().min(1, 'customerId is required'),
  castId: z.string().min(1, 'castId is required'),
  notes: z.string().max(500).optional(),
  assignedBy: assignmentSourceSchema.optional(),
})

const entrySelect = {
  customerId: true,
  castId: true,
  assignedAt: true,
  notes: true,
  assignedBy: true,
} as const

async function isCustomerAssignedToStore(customerId: string, storeId: string) {
  const assignment = await db.customerStoreAssignment.findUnique({
    where: { customerId_storeId: { customerId, storeId } },
    select: { customerId: true },
  })
  return assignment !== null
}

export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdmin({ permissions: 'customer:read' })
    if (authError) return authError

    const storeId = await ensureStoreId(await resolveStoreId(request))
    const storeAuthError = await requireAdmin({ permissions: 'customer:read', storeId })
    if (storeAuthError) return storeAuthError

    const customerId = request.nextUrl.searchParams.get('customerId')
    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 })
    }
    if (!(await isCustomerAssignedToStore(customerId, storeId))) {
      return NextResponse.json({ error: 'Customer not found in this store' }, { status: 404 })
    }

    const entries = await db.ngCastEntry.findMany({
      where: { customerId, cast: { storeId } },
      orderBy: { assignedAt: 'desc' },
      select: entrySelect,
    })

    return NextResponse.json({ data: entries })
  } catch (error) {
    logger.error({ err: error }, 'Failed to load NG cast entries')
    return NextResponse.json({ error: 'Failed to load NG settings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = await requireAdmin({ permissions: 'customer:update' })
    if (authError) return authError

    const storeId = await ensureStoreId(await resolveStoreId(request))
    const storeAuthError = await requireAdmin({ permissions: 'customer:update', storeId })
    if (storeAuthError) return storeAuthError

    const payload = await request.json()
    const data = upsertSchema.parse(payload)
    if (!(await isCustomerAssignedToStore(data.customerId, storeId))) {
      return NextResponse.json({ error: 'Customer not found in this store' }, { status: 404 })
    }
    const cast = await db.cast.findFirst({
      where: { id: data.castId, storeId },
      select: { id: true },
    })
    if (!cast) {
      return NextResponse.json({ error: 'Cast not found in this store' }, { status: 404 })
    }

    const entry = await db.ngCastEntry.upsert({
      where: {
        customerId_castId: {
          customerId: data.customerId,
          castId: data.castId,
        },
      },
      create: {
        customerId: data.customerId,
        castId: data.castId,
        notes: data.notes ?? null,
        assignedBy: data.assignedBy ?? 'staff',
      },
      update: {
        notes: data.notes ?? null,
        assignedBy: data.assignedBy ?? 'staff',
      },
      select: entrySelect,
    })

    return NextResponse.json({ data: entry })
  } catch (error) {
    logger.error({ err: error }, 'Failed to upsert NG cast entry')
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues.map((issue) => issue.message).join(', ') },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Failed to update NG settings' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authError = await requireAdmin({ permissions: 'customer:update' })
    if (authError) return authError

    const storeId = await ensureStoreId(await resolveStoreId(request))
    const storeAuthError = await requireAdmin({ permissions: 'customer:update', storeId })
    if (storeAuthError) return storeAuthError

    const searchParams = request.nextUrl.searchParams
    const customerId = searchParams.get('customerId')
    const castId = searchParams.get('castId')

    if (!customerId || !castId) {
      return NextResponse.json({ error: 'customerId and castId are required' }, { status: 400 })
    }
    if (!(await isCustomerAssignedToStore(customerId, storeId))) {
      return NextResponse.json({ error: 'Customer not found in this store' }, { status: 404 })
    }

    const result = await db.ngCastEntry.deleteMany({
      where: {
        customerId,
        castId,
        cast: { storeId },
      },
    })
    if (result.count === 0) {
      return NextResponse.json({ error: 'NG entry not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ err: error }, 'Failed to remove NG cast entry')
    return NextResponse.json({ error: 'Failed to remove NG settings' }, { status: 500 })
  }
}
