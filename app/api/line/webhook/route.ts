/**
 * @design_doc   LINE webhook endpoint for automatic cast registration
 * @related_to   lib/line/webhook.ts, lib/line/cast-registration-service.ts
 * @known_issues Does not yet support unlink commands
 */
import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { env } from '@/lib/config/env'
import { lineWebhookRequestSchema, verifyLineSignature } from '@/lib/line/webhook'
import { db } from '@/lib/db'
import { lineMessagingClient } from '@/lib/line/client'
import { LineCastRegistrationService } from '@/lib/line/cast-registration-service'

const castRegistrationService = new LineCastRegistrationService({
  castRepository: db.cast,
  messagingClient: lineMessagingClient,
})

export async function POST(request: NextRequest) {
  const channelSecret = env.line.messaging.channelSecret?.trim()
  if (!channelSecret) {
    return NextResponse.json(
      { error: 'LINE webhook is not configured.' },
      {
        status: 503,
      }
    )
  }

  const rawBody = await request.text()
  const signature = request.headers.get('x-line-signature')
  const isSignatureValid = verifyLineSignature({
    channelSecret,
    rawBody,
    signature,
  })

  if (!isSignatureValid) {
    logger.warn('Received LINE webhook with invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  let parsedBody: unknown
  try {
    parsedBody = JSON.parse(rawBody || '{}')
  } catch (error) {
    logger.warn({ err: error }, 'Failed to parse LINE webhook payload')
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const payloadResult = lineWebhookRequestSchema.safeParse(parsedBody)
  if (!payloadResult.success) {
    logger.warn({ issues: payloadResult.error.issues }, 'Invalid LINE webhook payload structure')
    return NextResponse.json({ error: 'Invalid payload structure' }, { status: 400 })
  }

  const events = payloadResult.data.events ?? []
  const results = []
  for (const event of events) {
    const result = await castRegistrationService.handleEvent(event)
    results.push(result)
  }

  return NextResponse.json({
    ok: true,
    results,
  })
}
