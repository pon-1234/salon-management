'use client'

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { Reservation } from '@/lib/types/reservation'
import type { CastChatEntry } from '@/lib/types/chat'
import { useStore } from '@/contexts/store-context'

export interface ReservationNotificationDetails {
  reservationId: string
  reservationDate: string
  reservationTime: string
  receivedTime: string
  staffName?: string
  customerName: string
  status: Reservation['status'] | 'reminder'
  startTime: string
  endTime: string
  storeId?: string
}

export interface ReservationNotification {
  id: string
  storeId: string
  storeName: string
  type: 'reservation'
  message: string
  details: ReservationNotificationDetails
  read: boolean
  readAt?: string | null
  createdAt: string
  assignedTo?: string | null
  resolvedAt?: string | null
}

export interface ChatNotificationDetails {
  castId: string
  castName: string
  unreadCount: number
  lastMessageTime?: string
}

export interface ChatNotification {
  id: string
  storeId: string
  storeName: string
  type: 'chat'
  message: string
  details: ChatNotificationDetails
  read: boolean
  readAt?: string | null
  createdAt: string
}

export type AdminNotification = ReservationNotification | ChatNotification

interface NotificationContextType {
  notifications: AdminNotification[]
  addNotification: (notification: AdminNotification) => void
  markAsRead: (id: string) => void
  markAsUnread: (id: string) => void
  assignNotification: (id: string, assignee: string) => void
  resolveNotification: (id: string, resolved: boolean) => void
  removeNotification: (id: string) => void
  unreadCount: number
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

function buildNotificationId(parts: (string | undefined)[]) {
  return parts.filter(Boolean).join('-')
}

function formatTime(date: Date) {
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatReservationTime(start: Date, end: Date) {
  const format = (value: Date) =>
    `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
  return `${format(start)}-${format(end)}`
}

type ReservationApiPayload = {
  id: string
  startTime: string
  endTime: string
  createdAt?: string
  status: Reservation['status']
  storeId?: string | null
  customer?: {
    id: string
    name?: string | null
    alias?: string | null
  } | null
  cast?: {
    id: string
    name?: string | null
  } | null
}

function deriveReservationsNotifications(
  reservations: ReservationApiPayload[],
  storeName: string
): ReservationNotification[] {
  const now = Date.now()
  const twentyFourHours = 24 * 60 * 60 * 1000

  return reservations
    .filter((reservation) => {
      if (reservation.status !== 'pending') {
        return false
      }

      const createdAt = reservation.createdAt instanceof Date ? reservation.createdAt : new Date()
      return now - createdAt.getTime() <= twentyFourHours
    })
    .map((reservation) => {
      const startTime = reservation.startTime instanceof Date ? reservation.startTime : new Date(reservation.startTime)
      const endTime = reservation.endTime instanceof Date ? reservation.endTime : new Date(reservation.endTime)
      const createdAt = reservation.createdAt instanceof Date ? reservation.createdAt : new Date()

      const storeId = reservation.storeId ?? 'ikebukuro'
      const staffName = reservation.cast?.name ?? undefined
      const customerName =
        reservation.customer?.alias ??
        reservation.customer?.name ??
        `顧客${reservation.customer?.id ?? reservation.id}`

      const reservationDateLabel = `${startTime.getMonth() + 1}/${startTime.getDate()}`
      const message = `${customerName}様から新しい予約が入りました。内容を確認してください。`

      return {
        id: buildNotificationId(['reservation', reservation.id]),
        storeId,
        storeName,
        type: 'reservation' as const,
        message,
        details: {
          reservationId: reservation.id,
          reservationDate: reservationDateLabel,
          reservationTime: formatReservationTime(startTime, endTime),
          receivedTime: formatTime(createdAt),
          staffName,
          customerName,
          status: reservation.status,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          storeId,
        },
        read: false,
        createdAt: createdAt.toISOString(),
      } satisfies ReservationNotification
    })
}

function deriveChatNotifications(entries: CastChatEntry[]): ChatNotification[] {
  return entries
    .filter((entry) => entry.hasUnread && entry.unreadCount > 0)
    .map((entry) => {
      const message =
        entry.unreadCount > 1
          ? `${entry.name}さんから${entry.unreadCount}件の未読メッセージがあります。`
          : `${entry.name}さんから新しいメッセージがあります。`

      return {
        id: buildNotificationId(['chat', entry.id]),
        storeId: 'chat',
        storeName: 'スタッフチャット',
        type: 'chat' as const,
        message,
        details: {
          castId: entry.id,
          castName: entry.name,
          unreadCount: entry.unreadCount,
          lastMessageTime: entry.lastMessageTime,
        },
        read: false,
        createdAt: new Date().toISOString(),
      } satisfies ChatNotification
    })
}

function mergeNotifications(prev: AdminNotification[], next: AdminNotification[]) {
  const now = Date.now()
  const twentyFourHours = 24 * 60 * 60 * 1000

  const base = prev.filter((notification) => {
    if (notification.type === 'chat') {
      return true
    }
    return now - new Date(notification.createdAt).getTime() <= twentyFourHours
  })

  const map = new Map(base.map((notification) => [notification.id, notification]))

  next.forEach((notification) => {
    const existing = map.get(notification.id)
    if (existing) {
      map.set(notification.id, {
        ...notification,
        read: existing.read,
        readAt: existing.readAt,
        assignedTo: 'assignedTo' in existing ? existing.assignedTo : undefined,
        resolvedAt: 'resolvedAt' in existing ? existing.resolvedAt : undefined,
      } as AdminNotification)
    } else {
      map.set(notification.id, notification)
    }
  })

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { currentStore } = useStore()
  const [notifications, setNotifications] = useState<AdminNotification[]>([])

  useEffect(() => {
    let isMounted = true

    const hydrateFromReservations = async () => {
      try {
        if (!currentStore?.id) {
          return
        }
        const params = new URLSearchParams({
          status: 'pending',
          limit: '20',
          sortBy: 'createdAt',
          sortOrder: 'desc',
        })
        params.set('storeId', currentStore.id)

        const response = await fetch(`/api/reservation?${params.toString()}`, {
          cache: 'no-store',
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch reservations: ${response.status}`)
        }

        const payload = await response.json()
        if (!isMounted || !Array.isArray(payload)) {
          return
        }

        const generated = deriveReservationsNotifications(payload, currentStore.displayName)
        setNotifications((prev) => mergeNotifications(prev, generated))
      } catch (error) {
        console.warn('[NotificationProvider] failed to load reservation notifications', error)
      }
    }

    hydrateFromReservations()

    const interval = setInterval(hydrateFromReservations, 30 * 1000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [currentStore?.id, currentStore?.displayName])

  useEffect(() => {
    let isMounted = true

    const hydrateFromChat = async () => {
      try {
        const response = await fetch('/api/chat/casts', {
          credentials: 'include',
          cache: 'no-store',
        })
        if (!response.ok) {
          throw new Error(`Failed to fetch chat notifications: ${response.status}`)
        }
        const payload = await response.json()
        const data = Array.isArray(payload?.data) ? payload.data : payload
        if (!Array.isArray(data) || !isMounted) return

        const chatNotifications = deriveChatNotifications(data as CastChatEntry[])
        setNotifications((prev) => {
          const others = prev.filter((notification) => notification.type !== 'chat')
          return mergeNotifications(others, chatNotifications)
        })
      } catch (error) {
        console.warn('[NotificationProvider] failed to load chat notifications', error)
      }
    }

    hydrateFromChat()
    const interval = setInterval(hydrateFromChat, 30 * 1000)

    const handleMessagesRead = (event: Event) => {
      const custom = event as CustomEvent<{ castId?: string }>
      const castId = custom.detail?.castId
      if (!castId) return

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.type === 'chat' && notification.details.castId === castId
            ? { ...notification, read: true, readAt: new Date().toISOString() }
            : notification
        )
      )
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('chat:messagesRead', handleMessagesRead as EventListener)
    }

    return () => {
      isMounted = false
      clearInterval(interval)
      if (typeof window !== 'undefined') {
        window.removeEventListener('chat:messagesRead', handleMessagesRead as EventListener)
      }
    }
  }, [])

  const addNotification = useCallback((notification: AdminNotification) => {
    setNotifications((prev) => mergeNotifications(prev, [notification]))
  }, [])

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id
          ? { ...notification, read: true, readAt: new Date().toISOString() }
          : notification
      )
    )
  }, [])

  const markAsUnread = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, read: false, readAt: null } : notification
      )
    )
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id))
  }, [])

  const assignNotification = useCallback((id: string, assignee: string) => {
    setNotifications((prev) =>
      prev.map((notification) => {
        if (notification.id !== id || notification.type !== 'reservation') {
          return notification
        }
        return { ...notification, assignedTo: assignee || null }
      })
    )
  }, [])

  const resolveNotification = useCallback((id: string, resolved: boolean) => {
    setNotifications((prev) =>
      prev.map((notification) => {
        if (notification.id !== id || notification.type !== 'reservation') {
          return notification
        }
        return { ...notification, resolvedAt: resolved ? new Date().toISOString() : null }
      })
    )
  }, [])

  const unreadCount = notifications.filter((notification) => !notification.read).length

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        markAsRead,
        markAsUnread,
        assignNotification,
        resolveNotification,
        removeNotification,
        unreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }

  return {
    hasNewNotifications: context.unreadCount > 0,
    notifications: context.notifications,
    unreadCount: context.unreadCount,
    addNotification: context.addNotification,
    markAsRead: context.markAsRead,
    markAsUnread: context.markAsUnread,
    assignNotification: context.assignNotification,
    resolveNotification: context.resolveNotification,
    removeNotification: context.removeNotification,
  }
}
