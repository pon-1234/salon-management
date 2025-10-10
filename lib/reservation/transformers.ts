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

export function mapReservationToReservationData(
  reservation: Reservation,
  options: TransformOptions = {}
): ReservationData {
  const casts = options.casts ?? []
  const customers = options.customers ?? defaultCustomers

  const start = new Date(reservation.startTime)
  const end = new Date(reservation.endTime)

  const staffId = reservation.staffId || (reservation as any).castId || ''
  const cast = casts.find((member) => member.id === staffId)

  const serviceId = reservation.serviceId || (reservation as any).courseId || ''
  const course = getCourseById(serviceId)

  const customer =
    customers.find((entry) => entry.id === reservation.customerId) || (reservation as any).customer

  const customerName = reservation.customerName || customer?.name || `顧客${reservation.customerId}`
  const staffName = reservation.staffName || cast?.name || `スタッフ${staffId || '-'}`.trim()

  const totalPayment = reservation.price ?? course?.price ?? 0
  const storeRevenue = Math.floor(totalPayment * 0.6)
  const staffRevenue = totalPayment - storeRevenue

  const rawOptions = (reservation as any).options
  const optionMap: Record<string, boolean> = {}
  if (Array.isArray(rawOptions)) {
    rawOptions.forEach((entry: any) => {
      const key = entry?.option?.name || entry?.optionId || entry?.id
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
    prefecture: (reservation as any).prefecture || '東京都',
    district: (reservation as any).district || '未設定',
    location: (reservation as any).location || '未設定',
    locationType: (reservation as any).locationType || '未設定',
    specificLocation: (reservation as any).specificLocation || '',
    staff: staffName,
    staffId,
    marketingChannel: (reservation as any).marketingChannel || '未設定',
    date: format(start, 'yyyy-MM-dd'),
    time: format(start, 'HH:mm'),
    inOutTime: `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`,
    course: reservation.serviceName || course?.name || '未設定',
    serviceId,
    freeExtension: (reservation as any).freeExtension || '0',
    designation: (reservation as any).designation || 'なし',
    designationFee: (reservation as any).designationFee || '0円',
    options: optionMap,
    transportationFee: (reservation as any).transportationFee ?? 0,
    paymentMethod: (reservation as any).paymentMethod || '現金',
    discount: (reservation as any).discount || 'なし',
    additionalFee: (reservation as any).additionalFee ?? 0,
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
  }
}
