export interface ModificationHistory {
  id: string
  reservationId: string
  userId: string
  userName: string
  fieldName: string
  fieldDisplayName: string
  oldValue: string | number | null
  newValue: string | number | null
  reason: string
  ipAddress: string
  userAgent: string
  sessionId: string
  timestamp: Date
}

export interface ModificationAlert {
  id: string
  reservationId: string
  type: 'warning' | 'error' | 'info'
  message: string
  timestamp: Date
  isRead: boolean
}
