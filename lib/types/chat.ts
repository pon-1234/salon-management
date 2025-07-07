export interface ReservationInfo {
  date: string
  time: string
  confirmedDate: string
}

export interface Message {
  id: string
  sender: 'customer' | 'staff'
  content: string
  timestamp: string
  customerId: string // customerId を追加
  readStatus?: '既読' | '未読'
  isReservationInfo?: boolean
  reservationInfo?: ReservationInfo
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
}
