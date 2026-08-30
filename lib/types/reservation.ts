/**
 * @design_doc   Reservation domain and admin mutation payload contracts
 * @related_to   ReservationDialog, ReservationRepository, reservation API
 * @known_issues None
 */
import { BaseEntity } from '../shared'
import { ReservationStatus } from '../constants'

export interface Reservation extends BaseEntity {
  customerId: string
  staffId: string
  castId?: string
  serviceId: string
  courseId?: string
  receptionStaffId?: string | null
  optionIds?: string[]
  startTime: Date
  endTime: Date
  status: ReservationStatus
  price: number
  storeId: string
  notes?: string
  storeMemo?: string
  modifiableUntil?: Date
  lastModified?: Date
  customerName?: string
  staffName?: string
  serviceName?: string
  designationType?: string | null
  designationFee?: number
  transportationFee?: number
  additionalFee?: number
  discountAmount?: number
  welfareExpense?: number
  storeRevenue?: number
  staffRevenue?: number
  paymentMethod?: string
  paymentReference?: string | null
  marketingChannel?: string
  areaId?: string | null
  areaName?: string
  areaPrefecture?: string
  areaCity?: string
  stationId?: string | null
  stationName?: string
  stationTravelTime?: number
  hotelId?: string | null
  hotelName?: string | null
  hotelExpense?: number
  roomNumber?: string | null
  entryMemo?: string
  entryReceivedAt?: Date
  entryReceivedBy?: string
  entryNotifiedAt?: Date
  entryConfirmedAt?: Date
  entryReminderSentAt?: Date
  locationMemo?: string
  castCheckedInAt?: Date | null
  castCheckedOutAt?: Date | null
  cancellationSource?: 'customer' | 'store' | null
  cancellationReason?: string | null
  options?: Array<{
    id?: string
    reservationId?: string
    optionId?: string | null
    optionName?: string | null
    optionPrice?: number | null
    storeShare?: number | null
    castShare?: number | null
    option?: {
      id?: string | null
      name?: string | null
      price?: number | null
    } | null
  }>
  pointsUsed?: number
  creditCardFee?: number
  courseItems?: Array<{
    id: string
    name: string
    duration: number
    price: number
    storeShare?: number | null
    castShare?: number | null
    sortOrder: number
  }>
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
  receptionStaffId?: string | null
  storeId?: string
  marketingChannel: string
  date: string
  time: string
  inOutTime: string
  course: string
  serviceId?: string
  freeExtension: string
  designation: string
  designationType?: string | null
  designationFee: string
  options: Record<string, boolean>
  transportationFee: number
  paymentMethod: string
  paymentReference?: string | null
  discount: string
  additionalFee: number
  discountAmount?: number
  welfareExpense?: number
  totalPayment: number
  price?: number
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
  hotelId?: string | null
  hotelName?: string
  hotelExpense?: number
  roomNumber?: string
  entryMemo?: string
  entryReceivedAt?: Date | null
  entryReceivedBy?: string
  entryNotifiedAt?: Date | null
  entryConfirmedAt?: Date | null
  entryReminderSentAt?: Date | null
  locationMemo?: string
  castCheckedInAt?: Date | null
  castCheckedOutAt?: Date | null
  pointsUsed?: number
  creditCardFee?: number
  courseItems?: Reservation['courseItems']
  cancellationSource?: 'customer' | 'store' | null
  cancellationReason?: string | null
}

export interface ReservationUpdatePayload {
  startTime: Date
  endTime: Date
  castId: string
  receptionStaffId?: string | null
  courseId?: string
  courseIds?: string[]
  status?: ReservationStatus
  cancellationSource?: 'customer' | 'store' | null
  cancellationReason?: string | null
  notes?: string
  storeMemo?: string
  price?: number
  designationType?: string | null
  designationFee?: number
  transportationFee?: number
  additionalFee?: number
  discountAmount?: number
  welfareExpense?: number
  storeRevenue?: number
  staffRevenue?: number
  paymentMethod?: string
  paymentReference?: string | null
  marketingChannel?: string
  areaId?: string | null
  stationId?: string | null
  hotelId?: string | null
  hotelName?: string | null
  hotelExpense?: number
  roomNumber?: string | null
  locationMemo?: string
  options?: string[]
  pointsUsed?: number
  castCheckedInAt?: Date | null
  castCheckedOutAt?: Date | null
}

export interface ReservationStatusUpdatePayload {
  status: ReservationStatus
  cancellationSource?: 'customer' | 'store' | null
  cancellationReason?: string | null
}

export type ReservationSavePayload = ReservationUpdatePayload | ReservationStatusUpdatePayload

export type ReservationApiUpdatePayload = Omit<
  Partial<Reservation>,
  'id' | 'createdAt' | 'updatedAt' | 'options'
> & {
  options?: string[]
}

export interface Service extends BaseEntity {
  name: string
  duration: number
  price: number
}
