/**
 * @design_doc   Store-scoped administrative notification hydration
 * @related_to   NotificationProvider and /api/chat/casts
 * @known_issues None
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { NotificationProvider, useNotifications } from './notification-context'

const ikebukuroStore = {
  id: 'store-a',
  slug: 'ikebukuro',
  displayName: '池袋店',
}

let currentStore: typeof ikebukuroStore | null = ikebukuroStore

vi.mock('@/contexts/store-context', () => ({
  useStore: () => ({ currentStore }),
}))

vi.mock('@/contexts/realtime-context', () => ({
  useRealtimeRevision: () => 0,
}))

function NotificationProbe() {
  const { addNotification, notifications } = useNotifications()
  return (
    <>
      <button
        type="button"
        onClick={() =>
          addNotification({
            id: 'reservation-old-store',
            storeId: 'store-a',
            storeName: '池袋店',
            type: 'reservation',
            message: 'old store reservation',
            details: {
              reservationId: 'reservation-old-store',
              reservationDate: '08/15',
              reservationTime: '12:00-13:00',
              receivedTime: '08/15 11:00',
              customerName: 'Customer A',
              status: 'pending',
              startTime: '2026-08-15T03:00:00.000Z',
              endTime: '2026-08-15T04:00:00.000Z',
              storeId: 'store-a',
            },
            read: false,
            createdAt: new Date().toISOString(),
          })
        }
      >
        seed old reservation
      </button>
      <div data-testid="notifications">
        {notifications
          .map(
            (notification) =>
              `${notification.type}:${notification.storeId}:${notification.storeName}`
          )
          .join(',')}
      </div>
    </>
  )
}

describe('NotificationProvider store scope', () => {
  beforeEach(() => {
    currentStore = ikebukuroStore
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('hydrates cast chat notifications from the active store and labels them with that store', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.startsWith('/api/reservation?')) {
        return Response.json([])
      }
      if (url === '/api/chat/casts?storeId=store-a') {
        return Response.json({
          data: [
            {
              id: 'cast-a',
              name: 'Cast A',
              lastMessage: 'message',
              lastMessageTime: '08/15 12:00',
              hasUnread: true,
              unreadCount: 1,
              isOnline: false,
              status: 'オフライン',
            },
          ],
        })
      }
      return Response.json({ error: 'unexpected request' }, { status: 400 })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <NotificationProvider>
        <NotificationProbe />
      </NotificationProvider>
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/chat/casts?storeId=store-a',
        expect.objectContaining({ credentials: 'include', cache: 'no-store' })
      )
      expect(screen.getByTestId('notifications')).toHaveTextContent('chat:store-a:池袋店')
    })
  })

  it('removes reservation notifications owned by the previous store on a store switch', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.startsWith('/api/reservation?')) {
        return Response.json([])
      }
      if (url.startsWith('/api/chat/casts?')) {
        return Response.json({ data: [] })
      }
      return Response.json({ error: 'unexpected request' }, { status: 400 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const view = render(
      <NotificationProvider>
        <NotificationProbe />
      </NotificationProvider>
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/chat/casts?storeId=store-a',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      )
    })
    fireEvent.click(screen.getByRole('button', { name: 'seed old reservation' }))
    expect(screen.getByTestId('notifications')).toHaveTextContent('reservation:store-a:池袋店')

    currentStore = {
      id: 'store-b',
      slug: 'shinjuku',
      displayName: '新宿店',
    }
    view.rerender(
      <NotificationProvider>
        <NotificationProbe />
      </NotificationProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('notifications')).not.toHaveTextContent(
        'reservation:store-a:池袋店'
      )
    })
  })

  it('aborts the previous store request and ignores its stale response after a store switch', async () => {
    let resolveStoreA: ((response: Response) => void) | undefined
    let storeASignal: AbortSignal | null = null
    const pendingStoreA = new Promise<Response>((resolve) => {
      resolveStoreA = resolve
    })

    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.startsWith('/api/reservation?')) {
        return Promise.resolve(Response.json([]))
      }
      if (url === '/api/chat/casts?storeId=store-a') {
        storeASignal = init?.signal ?? null
        return pendingStoreA
      }
      if (url === '/api/chat/casts?storeId=store-b') {
        return Promise.resolve(
          Response.json({
            data: [
              {
                id: 'cast-b',
                name: 'Cast B',
                lastMessage: 'message',
                lastMessageTime: '08/15 12:01',
                hasUnread: true,
                unreadCount: 1,
                isOnline: false,
                status: 'オフライン',
              },
            ],
          })
        )
      }
      return Promise.resolve(Response.json({ error: 'unexpected request' }, { status: 400 }))
    })
    vi.stubGlobal('fetch', fetchMock)

    const view = render(
      <NotificationProvider>
        <NotificationProbe />
      </NotificationProvider>
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/chat/casts?storeId=store-a',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      )
    })

    currentStore = {
      id: 'store-b',
      slug: 'shinjuku',
      displayName: '新宿店',
    }
    view.rerender(
      <NotificationProvider>
        <NotificationProbe />
      </NotificationProvider>
    )

    await waitFor(() => {
      expect(storeASignal?.aborted).toBe(true)
      expect(screen.getByTestId('notifications')).toHaveTextContent('chat:store-b')
    })

    await act(async () => {
      resolveStoreA?.(
        Response.json({
          data: [
            {
              id: 'cast-a',
              name: 'Cast A',
              lastMessage: 'stale message',
              lastMessageTime: '08/15 12:00',
              hasUnread: true,
              unreadCount: 1,
              isOnline: false,
              status: 'オフライン',
            },
          ],
        })
      )
      await pendingStoreA
    })

    expect(screen.getByTestId('notifications')).toHaveTextContent('chat:store-b')
    expect(screen.getByTestId('notifications')).not.toHaveTextContent('chat:store-a')
  })
})
