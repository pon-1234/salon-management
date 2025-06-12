"use client"

import React, { createContext, useContext, useState, useCallback } from 'react'

interface NotificationDetails {
  reservationDate?: string
  reservationTime?: string
  receivedTime: string
  staff?: string
  customer: string
  phoneNumber?: string
  callDuration?: string
  callStatus?: "answered" | "rejected" | "missed"
}

interface Notification {
  id: string
  storeName: string
  type: "reservation" | "incoming_call"
  message: string
  details: NotificationDetails
  read: boolean
}

interface NotificationContextType {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id'>) => void
  markAsRead: (id: string) => void
  removeNotification: (id: string) => void
  unreadCount: number
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      storeName: "金の玉クラブ池袋～密着零丸マッサージ～",
      type: "reservation" as const,
      message: "新しい予約が入りました。",
      details: {
        reservationDate: "12/15",
        reservationTime: "16:00-17:30",
        receivedTime: "12/09 08:19",
        staff: "らん",
        customer: "priv_hon.",
      },
      read: false,
    },
    {
      id: "2",
      storeName: "金の玉クラブ新宿～癒しの手技～",
      type: "reservation" as const,
      message: "予約がキャンセルされました。",
      details: {
        reservationDate: "12/10",
        reservationTime: "14:00-15:30",
        receivedTime: "12/09 10:45",
        staff: "みく",
        customer: "tanaka_456",
      },
      read: true,
    },
    {
      id: "3",
      storeName: "金の玉クラブ渋谷～極上の癒し空間～",
      type: "reservation" as const,
      message: "予約時間が変更されました。",
      details: {
        reservationDate: "12/12",
        reservationTime: "18:30-20:00",
        receivedTime: "12/09 15:30",
        staff: "さくら",
        customer: "yamada_789",
      },
      read: false,
    },
  ])

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    setNotifications(prev => [newNotification, ...prev])
  }, [])

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ))
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      markAsRead,
      removeNotification,
      unreadCount
    }}>
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
    removeNotification: context.removeNotification
  }
}