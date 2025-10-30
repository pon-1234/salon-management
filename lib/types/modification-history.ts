export interface ModificationHistory {
  id: string
  reservationId: string
  fieldName: string
  fieldDisplayName: string
  oldValue: string | null
  newValue: string | null
  reason: string | null
  actorId: string | null
  actorName: string | null
  actorIp?: string | null
  actorAgent?: string | null
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
