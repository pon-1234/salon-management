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
    customerId: z.string().min(1).optional(),
    castId: z.string().min(1).optional(),
    sender: z.enum(['customer', 'staff', 'cast']),
    content: z.string().optional(),
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
  .refine((data) => data.customerId || data.castId, {
    message: 'customerId または castId のいずれかを指定してください',
  })
  .refine(
    (data) => {
      const contentLength = (data.content ?? '').trim().length
      const attachmentCount = data.attachments?.length ?? 0
      return contentLength > 0 || attachmentCount > 0
    },
    { message: 'メッセージまたは画像を入力してください' }
  )
