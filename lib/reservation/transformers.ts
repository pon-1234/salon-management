/**
 * @design_doc   Lossless mapping from reservation API records to admin dialog data
 * @related_to   ReservationData, ReservationDialog, reservation-list page
 * @known_issues None
 */
import { format } from 'date-fns'
import { Reservation, ReservationData } from '@/lib/types/reservation'
import { customers as defaultCustomers } from '@/lib/customer/data'
import { Customer } from '@/lib/customer/types'
import { Cast } from '@/lib/cast/types'
import { getCourseById } from '@/lib/course-option/utils'

interface TransformOptions {
  casts?: Cast[]
  customers?: Customer[]
}

const statusLabelMap: Record<string, string> = {
  confirmed: '確定済',
  pending: '仮予約',
  tentative: '仮予約',
  cancelled: 'キャンセル',
  modifiable: '修正可能',
  completed: '完了',
}

const designationTypeLabel: Record<string, string> = {
  special: '特別指名',
  regular: '本指名',
  none: 'フリー',
}

const toDateOrNull = (value: unknown): Date | null => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value as any)
  return Number.isNaN(date.getTime()) ? null : date
}

const toDateOrUndefined = (value: unknown): Date | undefined => {
  const date = toDateOrNull(value)
  return date ?? undefined
}

export function mapReservationToReservationData(
  reservation: Reservation,
  options: TransformOptions = {}
): ReservationData {
  const casts = options.casts ?? []
  const customers = options.customers ?? defaultCustomers

  const start = new Date(reservation.startTime)
  const end = new Date(reservation.endTime)

  const rawCast = (reservation as any).cast
  const rawCourse = (reservation as any).course
  const rawArea = (reservation as any).area
  const rawStation = (reservation as any).station
  const castId =
    (reservation as any).castId ||
    reservation.castId ||
    reservation.staffId ||
    (rawCast && rawCast.id) ||
    ''
  const cast = casts.find((member) => member.id === castId)

  const serviceId = reservation.serviceId || (reservation as any).courseId || rawCourse?.id || ''
  const course = getCourseById(serviceId)

  const customer =
    customers.find((entry) => entry.id === reservation.customerId) || (reservation as any).customer

  const customerName = reservation.customerName || customer?.name || `顧客${reservation.customerId}`
  const staffName =
    reservation.staffName || cast?.name || (rawCast && rawCast.name) || '担当キャスト未設定'

  const normalizedStaffName = staffName.startsWith('スタッフ') && cast?.name ? cast.name : staffName

  const totalPayment = reservation.price ?? course?.price ?? 0
  const storeRevenue = reservation.storeRevenue ?? Math.floor(totalPayment * 0.6)
  const staffRevenue = reservation.staffRevenue ?? totalPayment - storeRevenue

  const rawOptions = (reservation as any).options
  const optionMap: Record<string, boolean> = {}
  if (Array.isArray(rawOptions)) {
    rawOptions.forEach((entry: any) => {
      const key = entry?.optionId || entry?.option?.id || entry?.option?.name || entry?.id
      if (key) {
        optionMap[String(key)] = true
      }
    })
  } else if (rawOptions && typeof rawOptions === 'object') {
    Object.entries(rawOptions).forEach(([key, value]) => {
      optionMap[String(key)] = Boolean(value)
    })
  }

  return {
    id: reservation.id,
    customerId: reservation.customerId,
    customerName,
    customerType: customer?.memberType === 'vip' ? 'VIP顧客' : '通常顧客',
    phoneNumber: customer?.phone || '',
    email: customer?.email,
    points: customer?.points ?? 0,
    bookingStatus: statusLabelMap[reservation.status] ?? reservation.status,
    status: reservation.status,
    staffConfirmation: '確認済',
    customerConfirmation: reservation.status === 'confirmed' ? '確認済' : '未確認',
    prefecture:
      reservation.areaPrefecture ||
      rawArea?.prefecture ||
      (reservation as any).prefecture ||
      '未設定',
    district: reservation.areaCity || rawArea?.city || (reservation as any).district || '未設定',
    location: reservation.areaName || rawArea?.name || (reservation as any).location || '未設定',
    locationType: (reservation as any).locationType || '未設定',
    specificLocation: reservation.locationMemo || (reservation as any).specificLocation || '',
    staff: normalizedStaffName,
    staffId: castId,
    storeId: reservation.storeId,
    marketingChannel:
      reservation.marketingChannel || (reservation as any).marketingChannel || '未設定',
    date: format(start, 'yyyy-MM-dd'),
    time: format(start, 'HH:mm'),
    inOutTime: `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`,
    course: reservation.serviceName || rawCourse?.name || course?.name || '未設定',
    serviceId,
    freeExtension: (reservation as any).freeExtension || '0',
    designation: reservation.designationType
      ? (designationTypeLabel[reservation.designationType] ?? reservation.designationType)
      : 'なし',
    designationType: reservation.designationType ?? null,
    designationFee: reservation.designationFee
      ? `${reservation.designationFee.toLocaleString()}円`
      : '0円',
    options: optionMap,
    transportationFee: reservation.transportationFee ?? (reservation as any).transportationFee ?? 0,
    paymentMethod: reservation.paymentMethod || (reservation as any).paymentMethod || '現金',
    paymentReference: reservation.paymentReference ?? null,
    discount: (reservation as any).discount || 'なし',
    additionalFee: reservation.additionalFee ?? (reservation as any).additionalFee ?? 0,
    discountAmount: reservation.discountAmount ?? 0,
    welfareExpense: reservation.welfareExpense ?? 0,
    totalPayment,
    storeRevenue,
    staffRevenue,
    staffBonusFee: (reservation as any).staffBonusFee ?? 0,
    startTime: start,
    endTime: end,
    staffImage: cast?.image || '/images/non-photo.svg',
    modifiableUntil: toDateOrUndefined(reservation.modifiableUntil),
    notes: reservation.notes,
    storeMemo: (reservation as any).storeMemo,
    areaId: reservation.areaId ?? rawArea?.id ?? null,
    areaName: reservation.areaName ?? rawArea?.name ?? undefined,
    stationId: reservation.stationId ?? rawStation?.id ?? null,
    stationName: reservation.stationName ?? rawStation?.name ?? undefined,
    stationTravelTime: reservation.stationTravelTime ?? rawStation?.travelTime ?? undefined,
    hotelId: reservation.hotelId ?? null,
    hotelName: reservation.hotelName ?? undefined,
    hotelExpense: reservation.hotelExpense ?? 0,
    roomNumber: reservation.roomNumber ?? undefined,
    entryMemo: reservation.entryMemo ?? undefined,
    entryReceivedAt: toDateOrNull(reservation.entryReceivedAt),
    entryReceivedBy: reservation.entryReceivedBy ?? undefined,
    entryNotifiedAt: toDateOrNull(reservation.entryNotifiedAt),
    entryConfirmedAt: toDateOrNull(reservation.entryConfirmedAt),
    entryReminderSentAt: toDateOrNull(reservation.entryReminderSentAt),
    locationMemo: reservation.locationMemo ?? undefined,
    castCheckedInAt: toDateOrNull(reservation.castCheckedInAt),
    castCheckedOutAt: toDateOrNull(reservation.castCheckedOutAt),
    pointsUsed: reservation.pointsUsed ?? 0,
    cancellationSource: reservation.cancellationSource ?? null,
    cancellationReason: reservation.cancellationReason ?? null,
  }
}
