/**
 * @design_doc   Cast Schedule API endpoints for CRUD operations
 * @related_to   CastRepository, CastSchedule type, Prisma CastSchedule model
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import logger from '@/lib/logger'
import { requireAdmin } from '@/lib/auth/utils'
import { handleApiError, ErrorResponses } from '@/lib/api/errors'
import { SuccessResponses } from '@/lib/api/responses'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const castId = searchParams.get('castId')
    const date = searchParams.get('date')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (id) {
      const schedule = await db.castSchedule.findUnique({
        where: { id },
        include: {
          cast: true,
        },
      })

      if (!schedule) {
        return ErrorResponses.notFound('スケジュール')
      }

      return SuccessResponses.ok(schedule)
    }

    // Build filters for querying schedules
    const where: Prisma.CastScheduleWhereInput = {}

    if (castId) where.castId = castId
    if (date) {
      where.date = new Date(date)
    } else if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const schedules = await db.castSchedule.findMany({
      where,
      include: {
        cast: true,
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    })

    return SuccessResponses.ok(schedules)
  } catch (error) {
    logger.error({ err: error }, 'Error fetching cast schedule data')
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const data = await request.json()

    const newSchedule = await db.castSchedule.create({
      data: {
        castId: data.castId,
        date: new Date(data.date),
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        isAvailable: data.isAvailable ?? true,
      },
      include: {
        cast: true,
      },
    })

    return SuccessResponses.created(newSchedule, 'スケジュールが作成されました')
  } catch (error) {
    logger.error({ err: error }, 'Error creating cast schedule')
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const data = await request.json()
    const { id, ...updates } = data

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const updatedSchedule = await db.castSchedule.update({
      where: { id },
      data: {
        date: updates.date ? new Date(updates.date) : undefined,
        startTime: updates.startTime ? new Date(updates.startTime) : undefined,
        endTime: updates.endTime ? new Date(updates.endTime) : undefined,
        isAvailable: updates.isAvailable,
      },
      include: {
        cast: true,
      },
    })

    return SuccessResponses.updated(updatedSchedule)
  } catch (error) {
    logger.error({ err: error }, 'Error updating cast schedule')
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return ErrorResponses.badRequest('IDが必要です')
    }

    await db.castSchedule.delete({
      where: { id },
    })

    return SuccessResponses.noContent()
  } catch (error) {
    logger.error({ err: error }, 'Error deleting cast schedule')
    return handleApiError(error)
  }
}
