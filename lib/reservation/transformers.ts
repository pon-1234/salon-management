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

export function mapReservationToReservationData(
  reservation: Reservation,
  options: TransformOptions = {}
): ReservationData {
  const casts = options.casts ?? []
  const customers = options.customers ?? defaultCustomers

  const start = new Date(reservation.startTime)
  const end = new Date(reservation.endTime)

  const rawCast = (reservation as any).cast
  const castId =
    (reservation as any).castId ||
    reservation.castId ||
    reservation.staffId ||
    (rawCast && rawCast.id) ||
    ''
  const cast = casts.find((member) => member.id === castId)

  const serviceId = reservation.serviceId || (reservation as any).courseId || ''
  const course = getCourseById(serviceId)

  const customer =
    customers.find((entry) => entry.id === reservation.customerId) || (reservation as any).customer

  const customerName = reservation.customerName || customer?.name || `顧客${reservation.customerId}`
  const staffName =
    reservation.staffName ||
    cast?.name ||
    (rawCast && rawCast.name) ||
    '担当キャスト未設定'

  const normalizedStaffName =
    staffName.startsWith('スタッフ') && cast?.name ? cast.name : staffName

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
    prefecture: reservation.areaPrefecture || (reservation as any).prefecture || '未設定',
    district: reservation.areaCity || (reservation as any).district || '未設定',
    location: reservation.areaName || (reservation as any).location || '未設定',
    locationType: (reservation as any).locationType || '未設定',
    specificLocation: reservation.locationMemo || (reservation as any).specificLocation || '',
    staff: normalizedStaffName,
    staffId: castId,
    storeId: reservation.storeId,
    marketingChannel: reservation.marketingChannel || (reservation as any).marketingChannel || '未設定',
    date: format(start, 'yyyy-MM-dd'),
    time: format(start, 'HH:mm'),
    inOutTime: `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`,
    course: reservation.serviceName || course?.name || '未設定',
    serviceId,
    freeExtension: (reservation as any).freeExtension || '0',
    designation:
      reservation.designationType && designationTypeLabel[reservation.designationType]
        ? designationTypeLabel[reservation.designationType]
        : 'なし',
    designationFee: reservation.designationFee
      ? `${reservation.designationFee.toLocaleString()}円`
      : '0円',
    options: optionMap,
    transportationFee: reservation.transportationFee ?? (reservation as any).transportationFee ?? 0,
    paymentMethod: reservation.paymentMethod || (reservation as any).paymentMethod || '現金',
    discount: (reservation as any).discount || 'なし',
    additionalFee: reservation.additionalFee ?? (reservation as any).additionalFee ?? 0,
    totalPayment,
    storeRevenue,
    staffRevenue,
    staffBonusFee: (reservation as any).staffBonusFee ?? 0,
    startTime: start,
    endTime: end,
    staffImage: cast?.image || '/placeholder-user.jpg',
    modifiableUntil: reservation.modifiableUntil,
    notes: reservation.notes,
    storeMemo: (reservation as any).storeMemo,
    areaId: reservation.areaId ?? null,
    areaName: reservation.areaName ?? undefined,
    stationId: reservation.stationId ?? null,
    stationName: reservation.stationName ?? undefined,
    stationTravelTime: reservation.stationTravelTime ?? undefined,
    locationMemo: reservation.locationMemo ?? undefined,
  }
}
