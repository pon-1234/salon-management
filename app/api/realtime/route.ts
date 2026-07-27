/**
 * @design_doc   docs/REALTIME_CHAT_IMPLEMENTATION_PLAN.md
 * @related_to   RealtimeProvider, ChatWindow, SimpleChatPanel, NotificationProvider
 * @known_issues Change detection uses lightweight indexed database probes until PostgreSQL LISTEN/NOTIFY is introduced
 */
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import logger from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const encoder = new TextEncoder()
const PROBE_INTERVAL_MS = 5_000

type RealtimeUser = {
  id: string
  role: string
  adminRole?: string
  storeIds?: string[]
}

function eventChunk(event: string): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: {}\n\n`)
}

async function getRealtimeRevision(user: RealtimeUser): Promise<string> {
  const messageWhere =
    user.role === 'customer'
      ? { customerId: user.id }
      : user.role === 'cast'
        ? { castId: user.id }
        : undefined

  const canReadReservations = user.role === 'admin'
  const reservationWhere =
    canReadReservations &&
    user.adminRole !== 'super_admin' &&
    Array.isArray(user.storeIds) &&
    user.storeIds.length > 0
      ? { storeId: { in: user.storeIds } }
      : undefined

  const [message, reservation] = await Promise.all([
    db.message.findFirst({
      where: messageWhere,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      select: { id: true, updatedAt: true },
    }),
    canReadReservations
      ? db.reservation.findFirst({
          where: reservationWhere,
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
          select: { id: true, updatedAt: true },
        })
      : Promise.resolve(null),
  ])

  return [
    message?.id ?? '',
    message?.updatedAt.toISOString() ?? '',
    reservation?.id ?? '',
    reservation?.updatedAt.toISOString() ?? '',
  ].join(':')
}

function createRealtimeStream(user: RealtimeUser, signal: AbortSignal): ReadableStream<Uint8Array> {
  let interval: ReturnType<typeof setInterval> | undefined
  let closed = false
  let probing = false
  let previousRevision: string | undefined
  let cleanup: (() => void) | undefined

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const release = () => {
        if (closed) return
        closed = true
        if (interval) clearInterval(interval)
      }
      const close = () => {
        release()
        controller.close()
      }
      cleanup = release
      signal.addEventListener('abort', close, { once: true })
      controller.enqueue(eventChunk('connected'))

      const probe = async () => {
        if (closed || probing) return
        probing = true
        try {
          const nextRevision = await getRealtimeRevision(user)
          if (previousRevision !== undefined && nextRevision !== previousRevision) {
            controller.enqueue(eventChunk('refresh'))
          }
          previousRevision = nextRevision
        } catch (error) {
          logger.warn('Realtime change probe failed', { error })
          if (!closed) controller.enqueue(eventChunk('unavailable'))
        } finally {
          probing = false
        }
      }

      await probe()
      if (!closed) interval = setInterval(() => void probe(), PROBE_INTERVAL_MS)
    },
    cancel() {
      cleanup?.()
    },
  })

  return stream
}

export async function GET(request: Request): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.role) {
    return Response.json({ error: 'Authentication required' }, { status: 401 })
  }

  const stream = createRealtimeStream(
    {
      id: session.user.id,
      role: session.user.role,
      adminRole: session.user.adminRole,
      storeIds: session.user.storeIds,
    },
    request.signal
  )

  return new Response(stream, {
    headers: {
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream',
      'X-Accel-Buffering': 'no',
    },
  })
}
