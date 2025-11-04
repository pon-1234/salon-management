// UI Constants
export const UI_CONSTANTS = {
  HEADER_HEIGHT: 73,
  DIALOG_MAX_HEIGHT: '90vh',
  DIALOG_Z_INDEX: 50,
} as const

// Status Values
export const RESERVATION_STATUS = {
  CONFIRMED: 'confirmed',
  PENDING: 'pending',
  CANCELLED: 'cancelled',
  MODIFIABLE: 'modifiable',
  COMPLETED: 'completed',
} as const

export const CUSTOMER_TYPES = {
  REGULAR: '通常顧客',
  VIP: 'VIP顧客',
  NG: 'NG顧客',
} as const

export const PAYMENT_METHODS = {
  CASH: '現金',
  CARD: 'クレジットカード',
} as const

// Default Values
export const DEFAULT_VALUES = {
  PHONE_NUMBER: '090-1234-5678',
  CUSTOMER_POINTS: 100,
  DESIGNATION_FEE: 3000,
  MODIFICATION_TIMEOUT_MINUTES: 30,
} as const

// Business Hours
export const BUSINESS_HOURS = {
  OPEN: 10,
  CLOSE: 24,
  LAST_ORDER: 23.5,
} as const

// Areas and Locations
export const AREAS = [
  '池袋',
  '新宿',
  '渋谷',
  '品川',
  '銀座',
  '上野',
  '秋葉原',
  '六本木',
  '恵比寿',
  '中野',
] as const

export const PREFECTURES = ['東京都', '神奈川県', '埼玉県', '千葉県'] as const

// Marketing Channels
export const MARKETING_CHANNELS = ['店リピート', '電話', '紹介', 'SNS', 'WEB', 'Heaven'] as const

// Staff Work Status
export const WORK_STATUS = {
  WORKING: '出勤',
  NOT_WORKING: '未出勤',
  REST: '休み',
  NOT_SET: '未設定',
} as const

export type ReservationStatus = (typeof RESERVATION_STATUS)[keyof typeof RESERVATION_STATUS]
export type CustomerType = (typeof CUSTOMER_TYPES)[keyof typeof CUSTOMER_TYPES]
export type PaymentMethod = (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS]
export type WorkStatus = (typeof WORK_STATUS)[keyof typeof WORK_STATUS]
