/**
 * @design_doc   Administrative chat must be constrained to the selected authorized store
 * @related_to   Chat, cast participant, customer participant, and broadcast API routes
 * @known_issues Multi-store customers remain unavailable until messages carry a store identity
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { GET as getChat, POST as postChat, PUT as putChat } from './route'
import { POST as postBroadcast } from './broadcast/route'
import { GET as getCasts } from './casts/route'
import { GET as getCustomers } from './customers/route'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth/utils'
import { castNotificationService } from '@/lib/notification/cast-service'

vi.mock('@/lib/auth/utils', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    $transaction: vi.fn(),
    cast: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    customer: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    store: {
      count: vi.fn(),
      findFirst: vi.fn(),
    },
    message: {
      count: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/notification/cast-service', () => ({
  castNotificationService: {
    sendChatMessageNotification: vi.fn(),
  },
}))

const cast = {
  id: 'cast-a',
  name: '店舗Aキャスト',
  image: '/cast-a.jpg',
  storeId: 'store-a',
}

const castMessage = {
  id: 'message-a',
  customerId: null,
  castId: cast.id,
  sender: 'cast',
  content: '確認しました',
  timestamp: new Date('2026-08-14T10:00:00+09:00'),
  readStatus: '未読',
  isReservationInfo: false,
  reservationInfo: null,
  attachments: null,
  createdAt: new Date('2026-08-14T10:00:00+09:00'),
  updatedAt: new Date('2026-08-14T10:00:00+09:00'),
}

describe('administrative chat store isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAdmin).mockResolvedValue(null)
    vi.mocked(db.store.count).mockResolvedValue(1)
    vi.mocked(db.store.findFirst).mockResolvedValue({ id: 'store-a' } as never)
    vi.mocked(db.cast.findMany).mockResolvedValue([])
    vi.mocked(db.customer.findMany).mockResolvedValue([])
    vi.mocked(db.message.findMany).mockResolvedValue([])
    vi.mocked(db.message.createMany).mockResolvedValue({ count: 0 })
    vi.mocked(db.$transaction).mockResolvedValue([])
  })

  it('lists only casts belonging to the selected authorized store', async () => {
    vi.mocked(db.cast.findMany).mockResolvedValue([cast] as never)

    const response = await getCasts(
      new NextRequest('http://localhost/api/chat/casts?storeId=store-a')
    )

    expect(response.status).toBe(200)
    expect(requireAdmin).toHaveBeenCalledWith({ permissions: 'cast:read', storeId: 'store-a' })
    expect(db.cast.findMany).toHaveBeenCalledWith({ where: { storeId: 'store-a' } })
    expect(db.message.findMany).toHaveBeenCalledWith({
      where: { castId: { in: ['cast-a'] } },
      orderBy: { timestamp: 'desc' },
    })
  })

  it('does not hydrate a cast deep link from another store', async () => {
    vi.mocked(db.cast.findFirst).mockResolvedValue(null)

    const response = await getCasts(
      new NextRequest('http://localhost/api/chat/casts?id=cast-b&storeId=store-a')
    )

    expect(response.status).toBe(404)
    expect(db.cast.findFirst).toHaveBeenCalledWith({
      where: { id: 'cast-b', storeId: 'store-a' },
    })
    expect(db.message.findFirst).not.toHaveBeenCalled()
  })

  it('reads cast messages only after validating the cast belongs to that store', async () => {
    vi.mocked(db.cast.findFirst).mockResolvedValue({ id: cast.id } as never)
    vi.mocked(db.message.findMany).mockResolvedValue([castMessage] as never)

    const response = await getChat(
      new NextRequest('http://localhost/api/chat?castId=cast-a&storeId=store-a')
    )

    expect(response.status).toBe(200)
    expect(db.cast.findFirst).toHaveBeenCalledWith({
      where: { id: 'cast-a', storeId: 'store-a' },
      select: { id: true },
    })
    expect(requireAdmin).toHaveBeenCalledWith({ permissions: 'cast:read', storeId: 'store-a' })
    expect(db.message.findMany).toHaveBeenCalledWith({
      where: { castId: 'cast-a' },
      orderBy: { timestamp: 'asc' },
    })
  })

  it('rejects a customer thread without a persisted store assignment', async () => {
    vi.mocked(db.customer.findFirst).mockResolvedValue(null)

    const response = await getChat(
      new NextRequest('http://localhost/api/chat?customerId=customer-b&storeId=store-a')
    )

    expect(response.status).toBe(404)
    expect(db.customer.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'customer-b',
        storeAssignments: {
          some: { storeId: 'store-a' },
          every: { storeId: 'store-a' },
        },
      },
      select: { id: true },
    })
    expect(requireAdmin).toHaveBeenCalledWith({
      permissions: 'customer:read',
      storeId: 'store-a',
    })
    expect(db.message.findMany).not.toHaveBeenCalled()
  })

  it('returns 404 without reading messages for a customer assigned to multiple stores', async () => {
    vi.mocked(db.customer.findFirst).mockResolvedValue(null)

    const response = await getChat(
      new NextRequest('http://localhost/api/chat?customerId=customer-multi&storeId=store-a')
    )

    expect(response.status).toBe(404)
    expect(db.customer.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'customer-multi',
        storeAssignments: {
          some: { storeId: 'store-a' },
          every: { storeId: 'store-a' },
        },
      },
      select: { id: true },
    })
    expect(db.message.findMany).not.toHaveBeenCalled()
  })

  it('rejects a message to a cast outside the selected store before persistence or LINE delivery', async () => {
    vi.mocked(db.cast.findFirst).mockResolvedValue(null)

    const response = await postChat(
      new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          storeId: 'store-a',
          castId: 'cast-b',
          sender: 'staff',
          content: '店舗Aからの連絡',
        }),
      })
    )

    expect(response.status).toBe(404)
    expect(requireAdmin).toHaveBeenCalledWith({ permissions: 'cast:read', storeId: 'store-a' })
    expect(db.message.create).not.toHaveBeenCalled()
    expect(castNotificationService.sendChatMessageNotification).not.toHaveBeenCalled()
  })

  it('requires customer:read and store access before sending a customer message', async () => {
    vi.mocked(db.customer.findFirst).mockResolvedValue({ id: 'customer-a' } as never)
    vi.mocked(db.message.create).mockResolvedValue({
      id: 'customer-message',
      customerId: 'customer-a',
      castId: null,
      sender: 'staff',
      content: '池袋店からのご連絡',
      timestamp: new Date('2026-08-14T11:00:00+09:00'),
      readStatus: '未読',
      isReservationInfo: false,
      reservationInfo: null,
      attachments: null,
      createdAt: new Date('2026-08-14T11:00:00+09:00'),
      updatedAt: new Date('2026-08-14T11:00:00+09:00'),
    } as never)

    const response = await postChat(
      new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          storeId: 'store-a',
          customerId: 'customer-a',
          sender: 'staff',
          content: '池袋店からのご連絡',
        }),
      })
    )

    expect(response.status).toBe(201)
    expect(requireAdmin).toHaveBeenCalledWith({
      permissions: 'customer:read',
      storeId: 'store-a',
    })
    expect(db.customer.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'customer-a',
        storeAssignments: {
          some: { storeId: 'store-a' },
          every: { storeId: 'store-a' },
        },
      },
      select: { id: true },
    })
  })

  it('updates read status only for an incoming message visible in the selected store', async () => {
    vi.mocked(db.message.findFirst).mockResolvedValue(null)

    const response = await putChat(
      new NextRequest('http://localhost/api/chat', {
        method: 'PUT',
        body: JSON.stringify({ storeId: 'store-a', id: 'foreign-message', readStatus: '既読' }),
      })
    )

    expect(response.status).toBe(404)
    expect(db.message.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'foreign-message',
        sender: { in: ['customer', 'cast'] },
        OR: [
          { cast: { is: { storeId: 'store-a' } } },
          {
            customer: {
              is: {
                storeAssignments: {
                  some: { storeId: 'store-a' },
                  every: { storeId: 'store-a' },
                },
              },
            },
          },
        ],
      },
      select: { id: true, customerId: true, castId: true },
    })
    expect(db.message.update).not.toHaveBeenCalled()
  })

  it.each([
    ['customer', { customerId: 'customer-a', castId: null }, 'customer:read'],
    ['cast', { customerId: null, castId: 'cast-a' }, 'cast:read'],
  ])(
    'requires the %s participant permission before marking a message as read',
    async (_participant, ids, permission) => {
      vi.mocked(db.message.findFirst).mockResolvedValue({ id: 'message-a', ...ids } as never)
      vi.mocked(db.message.update).mockResolvedValue({
        ...castMessage,
        id: 'message-a',
        ...ids,
        readStatus: '既読',
      } as never)

      const response = await putChat(
        new NextRequest('http://localhost/api/chat', {
          method: 'PUT',
          body: JSON.stringify({ storeId: 'store-a', id: 'message-a', readStatus: '既読' }),
        })
      )

      expect(response.status).toBe(200)
      expect(requireAdmin).toHaveBeenCalledWith({ permissions: permission, storeId: 'store-a' })
    }
  )

  it('broadcasts to casts in the selected store and only persists internal chat messages', async () => {
    vi.mocked(db.cast.findMany).mockResolvedValue([{ id: 'cast-a' }, { id: 'cast-a2' }] as never)
    vi.mocked(db.message.createMany).mockResolvedValue({ count: 2 })

    const response = await postBroadcast(
      new NextRequest('http://localhost/api/chat/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          storeId: 'store-a',
          target: 'casts',
          content: '本日の連絡',
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(requireAdmin).toHaveBeenCalledWith({ permissions: 'cast:read', storeId: 'store-a' })
    expect(db.cast.findMany).toHaveBeenCalledWith({
      where: { storeId: 'store-a' },
      select: { id: true },
    })
    expect(db.message.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ castId: 'cast-a', customerId: null, sender: 'staff' }),
      ]),
    })
    expect(db.$transaction).toHaveBeenCalledOnce()
    expect(castNotificationService.sendChatMessageNotification).not.toHaveBeenCalled()
  })

  it('uses persisted customer store assignments for customer broadcasts', async () => {
    vi.mocked(db.customer.findMany).mockResolvedValue([{ id: 'customer-a' }] as never)

    const response = await postBroadcast(
      new NextRequest('http://localhost/api/chat/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          storeId: 'store-a',
          target: 'customers',
          content: '店舗Aのお知らせ',
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(db.customer.findMany).toHaveBeenCalledWith({
      where: {
        storeAssignments: {
          some: { storeId: 'store-a' },
          every: { storeId: 'store-a' },
        },
      },
      select: { id: true },
    })
    expect(requireAdmin).toHaveBeenCalledWith({
      permissions: 'customer:read',
      storeId: 'store-a',
    })
  })

  it.each([
    [
      'customer list',
      () => getCustomers(new NextRequest('http://localhost/api/chat/customers?storeId=store-a')),
      'customer:read',
    ],
    [
      'cast list',
      () => getCasts(new NextRequest('http://localhost/api/chat/casts?storeId=store-a')),
      'cast:read',
    ],
  ])('checks %s permission together with store access', async (_label, invoke, permission) => {
    await invoke()

    expect(requireAdmin).toHaveBeenCalledWith({ permissions: permission, storeId: 'store-a' })
  })

  it('fails closed when an administrative chat request omits the current store', async () => {
    const response = await getCasts(new NextRequest('http://localhost/api/chat/casts'))

    expect(response.status).toBe(400)
    expect(db.cast.findMany).not.toHaveBeenCalled()
  })

  it('rejects an unknown or inactive store before returning participants', async () => {
    vi.mocked(db.store.findFirst).mockResolvedValue(null)

    const response = await getCasts(
      new NextRequest('http://localhost/api/chat/casts?storeId=inactive-store')
    )

    expect(response.status).toBe(404)
    expect(db.cast.findMany).not.toHaveBeenCalled()
  })
})
