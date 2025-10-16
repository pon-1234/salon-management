import { Cast, Appointment } from './types'
import { resolveOptionId } from '@/lib/options/data'

const toDate = (value: unknown): Date | undefined => {
  if (!value) return undefined
  const date = new Date(value as string)
  return Number.isNaN(date.getTime()) ? undefined : date
}

const normalizeImages = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0)
      }
    } catch {
      return value ? [value] : []
    }
  }

  return []
}

const normalizeAvailableOptions = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }
  const mapped = value
    .map((item) => (typeof item === 'string' ? item : String(item ?? '')))
    .filter((id) => id.length > 0)
    .map((id) => resolveOptionId(id))
  return Array.from(new Set(mapped))
}

const normalizeAppointment = (raw: any): Appointment | null => {
  if (!raw) return null
  const start = toDate(raw.startTime)
  const end = toDate(raw.endTime)
  if (!start || !end) return null

  return {
    id: String(raw.id ?? ''),
    customerId: String(raw.customerId ?? ''),
    serviceId: String(raw.serviceId ?? ''),
    staffId: String(raw.staffId ?? raw.castId ?? ''),
    serviceName: raw.service?.name ?? raw.serviceName ?? '未設定',
    startTime: start,
    endTime: end,
    customerName: raw.customer?.name ?? raw.customerName ?? 'お客様',
    customerPhone: raw.customer?.phone ?? raw.customerPhone ?? '',
    customerEmail: raw.customer?.email ?? raw.customerEmail ?? '',
    reservationTime: raw.reservationTime ?? '',
    status: raw.status === 'confirmed' ? 'confirmed' : 'provisional',
    location: raw.location,
    price: typeof raw.price === 'number' ? raw.price : Number(raw.price ?? 0),
  }
}

export const normalizeCast = (raw: any): Cast => {
  const appointmentsFromApi = Array.isArray(raw.appointments)
    ? raw.appointments
        .map(normalizeAppointment)
        .filter((appointment): appointment is Appointment => Boolean(appointment))
    : []

  const reservationAppointments = Array.isArray(raw.reservations)
    ? raw.reservations
        .map(normalizeAppointment)
        .filter((appointment): appointment is Appointment => Boolean(appointment))
    : []

  const appointments =
    appointmentsFromApi.length > 0 ? appointmentsFromApi : reservationAppointments

  return {
    id: String(raw.id ?? ''),
    name: raw.name ?? '',
    nameKana: raw.nameKana ?? raw.name ?? '',
    age: typeof raw.age === 'number' ? raw.age : Number(raw.age ?? 0),
    height: typeof raw.height === 'number' ? raw.height : Number(raw.height ?? 0),
    bust: String(raw.bust ?? ''),
    waist: typeof raw.waist === 'number' ? raw.waist : Number(raw.waist ?? 0),
    hip: typeof raw.hip === 'number' ? raw.hip : Number(raw.hip ?? 0),
    type: raw.type ?? '',
    image: raw.image ?? normalizeImages(raw.images)[0] ?? '',
    images: normalizeImages(raw.images ?? raw.image),
    description: raw.description ?? '',
    netReservation: Boolean(raw.netReservation),
    specialDesignationFee:
      raw.specialDesignationFee === null || raw.specialDesignationFee === undefined
        ? null
        : Number(raw.specialDesignationFee),
    regularDesignationFee:
      raw.regularDesignationFee === null || raw.regularDesignationFee === undefined
        ? null
        : Number(raw.regularDesignationFee),
    panelDesignationRank: Number(raw.panelDesignationRank ?? 0),
    regularDesignationRank: Number(raw.regularDesignationRank ?? 0),
    workStatus: raw.workStatus ?? '出勤',
    workStart: toDate(raw.workStart),
    workEnd: toDate(raw.workEnd),
    appointments,
    availableOptions: normalizeAvailableOptions(raw.availableOptions),
    publicProfile: raw.publicProfile,
    createdAt: toDate(raw.createdAt) ?? new Date(),
    updatedAt: toDate(raw.updatedAt) ?? new Date(),
  }
}

export const normalizeCastList = (rawList: any[]): Cast[] => {
  if (!Array.isArray(rawList)) {
    return []
  }
  return rawList.map(normalizeCast)
}
