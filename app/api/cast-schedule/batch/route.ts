/**
 * @design_doc   Batch API endpoint for cast schedule operations
 * @related_to   CastSchedule, Cast models
 * @known_issues None
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import logger from '@/lib/logger'
import { requireAdmin } from '@/lib/auth/utils'
import { handleApiError, ErrorResponses } from '@/lib/api/errors'
import { SuccessResponses } from '@/lib/api/responses'
import { z } from 'zod'
import { resolveStoreId, ensureStoreId } from '@/lib/store/server'
import { parseScheduleDateTimeInJst } from '@/lib/cast-schedule/date-time'

const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const scheduleTimeSchema = z.string().regex(/^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/)

const normalizeScheduleEndTime = (startTime: string, endTime: string): string =>
  endTime === '00:00' && startTime !== '00:00' ? '24:00' : endTime

// Validation schema for batch schedule update
const batchScheduleSchema = z.object({
  castId: z.string(),
  schedules: z.array(
    z
      .object({
        date: dateKeySchema,
        status: z.enum(['working', 'holiday']),
        startTime: scheduleTimeSchema.optional(),
        endTime: scheduleTimeSchema.optional(),
      })
      .superRefine((schedule, context) => {
        if (schedule.status !== 'working') return
        if (!schedule.startTime || !schedule.endTime) {
          context.addIssue({ code: z.ZodIssueCode.custom, message: '勤務時間が必要です' })
          return
        }

        const startTime = parseScheduleDateTimeInJst(schedule.date, schedule.startTime)
        const endTime = parseScheduleDateTimeInJst(
          schedule.date,
          normalizeScheduleEndTime(schedule.startTime, schedule.endTime)
        )
        if (endTime <= startTime) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: '終了時間は開始時間より後にしてください',
          })
        }
      })
  ),
})

export async function POST(request: NextRequest) {
  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const authError = await requireAdmin({ permissions: 'cast:update', storeId })
    if (authError) return authError

    const body = await request.json()
    const { castId, schedules } = batchScheduleSchema.parse(body)
    const cast = await db.cast.findFirst({ where: { id: castId, storeId } })
    if (!cast) {
      return ErrorResponses.notFound('キャスト')
    }

    // Use transaction for atomicity
    const result = await db.$transaction(async (tx) => {
      const updatedSchedules = []

      for (const schedule of schedules) {
        const date = parseScheduleDateTimeInJst(schedule.date, '00:00')

        // Check if schedule exists
        const existing = await tx.castSchedule.findUnique({
          where: {
            castId_date: {
              castId,
              date,
            },
          },
        })

        if (schedule.status === 'holiday') {
          // Delete existing schedule if it's a holiday
          if (existing) {
            await tx.castSchedule.delete({
              where: { id: existing.id },
            })
          }
          continue
        }

        // For working status, create or update
        if (schedule.startTime && schedule.endTime) {
          const startTime = parseScheduleDateTimeInJst(schedule.date, schedule.startTime)
          const endTime = parseScheduleDateTimeInJst(
            schedule.date,
            normalizeScheduleEndTime(schedule.startTime, schedule.endTime)
          )

          if (existing) {
            // Update existing
            const updated = await tx.castSchedule.update({
              where: { id: existing.id },
              data: {
                startTime,
                endTime,
                isAvailable: true,
              },
            })
            updatedSchedules.push(updated)
          } else {
            // Create new
            const created = await tx.castSchedule.create({
              data: {
                castId,
                date,
                startTime,
                endTime,
                isAvailable: true,
              },
            })
            updatedSchedules.push(created)
          }
        }
      }

      return updatedSchedules
    })

    logger.info({ castId, count: result.length }, 'Batch schedule update completed')

    return SuccessResponses.ok({
      message: 'スケジュールを一括更新しました',
      updatedCount: result.length,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ErrorResponses.badRequest('入力データが無効です')
    }

    logger.error({ err: error }, 'Error in batch schedule update')
    return handleApiError(error)
  }
}
