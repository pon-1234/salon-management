/**
 * @design_doc   Helpers for handling LINE Messaging API webhooks
 * @related_to   app/api/line/webhook/route.ts
 * @known_issues Does not cover video/audio events yet
 */
import { createHmac, timingSafeEqual } from 'crypto'
import { z } from 'zod'

export function verifyLineSignature(params: {
  channelSecret: string
  rawBody: string
  signature?: string | null
}): boolean {
  const { channelSecret, rawBody, signature } = params
  if (!channelSecret || !signature) return false

  try {
    const hmac = createHmac('sha256', channelSecret)
    hmac.update(rawBody)
    const digest = hmac.digest('base64')

    const expected = Buffer.from(digest, 'base64')
    const received = Buffer.from(signature, 'base64')

    if (expected.length !== received.length) {
      return false
    }

    return timingSafeEqual(expected, received)
  } catch {
    return false
  }
}

const lineEventSourceSchema = z.object({
  type: z.string(),
  userId: z.string().optional(),
  groupId: z.string().optional(),
  roomId: z.string().optional(),
})

const lineEventMessageSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  text: z.string().optional(),
})

const lineEventPostbackSchema = z.object({
  data: z.string(),
  params: z.record(z.string()).optional(),
})

export const lineWebhookEventSchema = z.object({
  type: z.string(),
  replyToken: z.string().optional(),
  timestamp: z.number().optional(),
  mode: z.string().optional(),
  source: lineEventSourceSchema.optional(),
  message: lineEventMessageSchema.optional(),
  postback: lineEventPostbackSchema.optional(),
})

export const lineWebhookRequestSchema = z.object({
  destination: z.string().optional(),
  events: z.array(lineWebhookEventSchema).default([]),
})

export type LineWebhookRequest = z.infer<typeof lineWebhookRequestSchema>
export type LineWebhookEvent = z.infer<typeof lineWebhookEventSchema>
