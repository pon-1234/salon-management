'use client'

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getAllMockReservations } from '@/lib/reservation/mock-data'
import { storesData } from '@/lib/store/data'
import { castMembers } from '@/lib/cast/data'
import { customers } from '@/lib/customer/data'
import type { Reservation } from '@/lib/types/reservation'

interface NotificationDetails {
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

interface Notification {
  id: string
  storeId: string
  storeName: string
  type: 'reservation'
  message: string
  details: NotificationDetails
  read: boolean
  readAt?: string | null
  createdAt: string
  assignedTo?: string | null
  resolvedAt?: string | null
}

interface NotificationContextType {
  notifications: Notification[]
  addNotification: (notification: Notification) => void
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
  const format = (date: Date) =>
    `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  return `${format(start)}-${format(end)}`
}

const storeMap = new Map(storesData.map((store) => [store.id, store.displayName ?? store.name]))
const castMap = new Map(castMembers.map((cast) => [cast.id, cast.name]))
const customerMap = new Map(customers.map((customer) => [customer.id, customer.name ?? customer.id]))
const twelveHours = 12 * 60 * 60 * 1000

function deriveReservationsNotifications(reservations: Reservation[]): Notification[] {
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
      const storeName = storeMap.get(storeId) ?? '池袋店'
      const staffName = castMap.get(reservation.staffId ?? '')
      const customerName = customerMap.get(reservation.customerId ?? '') ?? `顧客${reservation.customerId ?? ''}`

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
          staffName: staffName,
          customerName,
          status: reservation.status,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          storeId,
        },
        read: false,
        createdAt: createdAt.toISOString(),
      } satisfies Notification
    })
}

function mergeNotifications(prev: Notification[], next: Notification[]) {
  const now = Date.now()
  const twentyFourHours = 24 * 60 * 60 * 1000
  const base = prev.filter((notification) => now - new Date(notification.createdAt).getTime() <= twentyFourHours)
  const map = new Map(base.map((notification) => [notification.id, notification]))

  next.forEach((notification) => {
    const existing = map.get(notification.id)
    if (existing) {
      map.set(notification.id, {
        ...notification,
        read: existing.read,
        readAt: existing.readAt,
        assignedTo: existing.assignedTo,
        resolvedAt: existing.resolvedAt,
      })
    } else {
      map.set(notification.id, notification)
    }
  })

  return Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    let isMounted = true

    const hydrateFromReservations = async () => {
      try {
        const reservations = await getAllMockReservations()
        if (!isMounted) return
        const generated = deriveReservationsNotifications(reservations)
        setNotifications((prev) => mergeNotifications(prev, generated))
      } catch (error) {
        console.warn('[NotificationProvider] failed to load reservation notifications', error)
      }
    }

    hydrateFromReservations()

    const interval = setInterval(hydrateFromReservations, 5 * 60 * 1000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  const addNotification = useCallback((notification: Notification) => {
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
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const assignNotification = useCallback((id: string, assignee: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, assignedTo: assignee || null } : notification
      )
    )
  }, [])

  const resolveNotification = useCallback((id: string, resolved: boolean) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id
          ? { ...notification, resolvedAt: resolved ? new Date().toISOString() : null }
          : notification
      )
    )
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

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
