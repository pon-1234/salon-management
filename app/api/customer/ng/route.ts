import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import logger from '@/lib/logger'

const assignmentSourceSchema = z.enum(['customer', 'cast', 'staff'])

const upsertSchema = z.object({
  customerId: z.string().min(1, 'customerId is required'),
  castId: z.string().min(1, 'castId is required'),
  notes: z.string().max(500).optional(),
  assignedBy: assignmentSourceSchema.optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const payload = await request.json()
    const data = upsertSchema.parse(payload)
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
      select: {
        customerId: true,
        castId: true,
        assignedAt: true,
        notes: true,
        assignedBy: true,
      },
    })

    return NextResponse.json({ data: entry })
  } catch (error) {
    logger.error({ err: error }, 'Failed to upsert NG cast entry')
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues.map((issue) => issue.message).join(', ') }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update NG settings' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const customerId = searchParams.get('customerId')
    const castId = searchParams.get('castId')

    if (!customerId || !castId) {
      return NextResponse.json({ error: 'customerId and castId are required' }, { status: 400 })
    }

    try {
      await db.ngCastEntry.delete({
        where: {
          customerId_castId: {
            customerId,
            castId,
          },
        },
      })
    } catch (dbError: any) {
      if (dbError?.code === 'P2025') {
        return NextResponse.json({ error: 'NG entry not found' }, { status: 404 })
      }
      throw dbError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ err: error }, 'Failed to remove NG cast entry')
    return NextResponse.json({ error: 'Failed to remove NG settings' }, { status: 500 })
  }
}
