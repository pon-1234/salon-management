/**
 * @design_doc   Administrative chat request validation
 * @related_to   Admin chat route and attachment uploads
 * @known_issues Customer and cast portal messages use their own session-bound schemas
 */
import { z } from 'zod'

export const attachmentSchema = z.object({
  type: z.literal('image'),
  url: z.string().url(),
  name: z.string().optional(),
  size: z.number().int().min(0).optional(),
  contentType: z.string().optional(),
})

export const chatMessageSchema = z
  .object({
    storeId: z.string().trim().min(1).max(100),
    customerId: z.string().min(1).optional(),
    castId: z.string().min(1).optional(),
    sender: z.literal('staff'),
    content: z.string().max(1000).optional(),
    attachments: z.array(attachmentSchema).max(5).optional(),
    isReservationInfo: z.boolean().optional(),
    reservationInfo: z
      .object({
        date: z.string(),
        time: z.string(),
        confirmedDate: z.string(),
      })
      .optional(),
  })
  .refine((data) => Boolean(data.customerId) !== Boolean(data.castId), {
    message: 'customerId または castId のどちらか一方を指定してください',
  })
  .refine(
    (data) => {
      const contentLength = (data.content ?? '').trim().length
      const attachmentCount = data.attachments?.length ?? 0
      return contentLength > 0 || attachmentCount > 0
    },
    { message: 'メッセージまたは画像を入力してください' }
  )
