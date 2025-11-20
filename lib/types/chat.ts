export interface ReservationInfo {
  date: string
  time: string
  confirmedDate: string
}

export type ChatAttachmentType = 'image'

export interface ChatAttachment {
  type: ChatAttachmentType
  url: string
  name?: string
  size?: number
  contentType?: string
  width?: number
  height?: number
}

export interface Message {
  id: string
  sender: 'customer' | 'staff' | 'cast'
  content: string
  timestamp: string
  customerId?: string
  castId?: string
  readStatus?: '既読' | '未読'
  isReservationInfo?: boolean
  reservationInfo?: ReservationInfo
  attachments?: ChatAttachment[]
}

export interface Customer {
  id: string
  name: string
  lastMessage: string
  lastMessageTime: string
  hasUnread: boolean
  unreadCount: number
  isOnline: boolean
  avatar?: string
  lastSeen?: string
  memberType: 'regular' | 'vip'
  status?: 'オンライン' | 'オフライン' | '退席中'
}

export interface CastChatEntry {
  id: string
  name: string
  lastMessage: string
  lastMessageTime: string
  hasUnread: boolean
  unreadCount: number
  isOnline: boolean
  avatar?: string
  lastSeen?: string
  status: 'オンライン' | 'オフライン' | '退席中'
}
