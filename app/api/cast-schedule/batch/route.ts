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

// Validation schema for batch schedule update
const batchScheduleSchema = z.object({
  castId: z.string(),
  schedules: z.array(
    z.object({
      date: z.string(),
      status: z.enum(['working', 'holiday']),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
    })
  ),
})

export async function POST(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const body = await request.json()
    const { castId, schedules } = batchScheduleSchema.parse(body)

    // Use transaction for atomicity
    const result = await db.$transaction(async (tx) => {
      const updatedSchedules = []

      for (const schedule of schedules) {
        const date = new Date(schedule.date)
        
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
          const startTime = new Date(`${schedule.date}T${schedule.startTime}:00`)
          const endTime = new Date(`${schedule.date}T${schedule.endTime}:00`)

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
      return ErrorResponses.badRequest('入力データが無効です', error.errors)
    }
    
    logger.error({ err: error }, 'Error in batch schedule update')
    return handleApiError(error)
  }
}