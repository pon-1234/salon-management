import { BaseEntity } from '../shared'
import { ReservationStatus } from '../constants'

export interface Reservation extends BaseEntity {
  customerId: string
  staffId: string
  serviceId: string
  startTime: Date
  endTime: Date
  status: ReservationStatus
  price: number
  storeId: string
  notes?: string
  modifiableUntil?: Date
  lastModified?: Date
  customerName?: string
  staffName?: string
  serviceName?: string
  designationType?: string
  designationFee?: number
  transportationFee?: number
  additionalFee?: number
  paymentMethod?: string
  marketingChannel?: string
  storeRevenue?: number
  staffRevenue?: number
  areaId?: string | null
  areaName?: string
  areaPrefecture?: string
  areaCity?: string
  stationId?: string | null
  stationName?: string
  stationTravelTime?: number
  locationMemo?: string
}

export interface ReservationData {
  id: string
  customerId: string
  customerName: string
  customerType: string
  phoneNumber: string
  email?: string
  points: number
  bookingStatus: string
  status?: string
  staffConfirmation: string
  customerConfirmation: string
  prefecture: string
  district: string
  location: string
  locationType: string
  specificLocation: string
  staff: string
  staffId?: string
  storeId?: string
  marketingChannel: string
  date: string
  time: string
  inOutTime: string
  course: string
  serviceId?: string
  freeExtension: string
  designation: string
  designationFee: string
  options: Record<string, boolean>
  transportationFee: number
  paymentMethod: string
  discount: string
  additionalFee: number
  totalPayment: number
  storeRevenue: number
  staffRevenue: number
  staffBonusFee: number
  startTime: Date
  endTime: Date
  staffImage: string
  modifiableUntil?: Date
  notes?: string
  storeMemo?: string
  areaId?: string | null
  areaName?: string
  stationId?: string | null
  stationName?: string
  stationTravelTime?: number
  locationMemo?: string
}

export interface ReservationUpdatePayload {
  startTime: Date
  endTime: Date
  castId: string
  status?: ReservationStatus
  notes?: string
  storeMemo?: string
  price?: number
  designationType?: string
  designationFee?: number
  transportationFee?: number
  additionalFee?: number
  paymentMethod?: string
  marketingChannel?: string
  areaId?: string | null
  stationId?: string | null
  locationMemo?: string
}

export interface Service extends BaseEntity {
  name: string
  duration: number
  price: number
}
