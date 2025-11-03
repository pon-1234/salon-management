/**
 * @design_doc   Shared revenue calculator for reservations
 * @related_to   Reservation pricing/financial breakdown on admin UI and API
 * @known_issues Assumes percentage inputs between 0-100; clamps negative values to 0
 */
export interface RevenueOptionShare {
  price: number
  storeShare?: number | null
  castShare?: number | null
}

export interface RevenueDesignationShare {
  amount: number
  storeShare?: number | null
  castShare?: number | null
}

export interface ReservationRevenueInput {
  basePrice: number
  options?: RevenueOptionShare[]
  designation?: RevenueDesignationShare | null
  transportationFee?: number
  additionalFee?: number
  discountAmount?: number
  welfareRate?: number | null
}

export interface ReservationRevenueResult {
  total: number
  welfareExpense: number
  welfareRate: number
  courseStoreShare: number
  courseCastShare: number
  optionsTotal: number
  optionStoreShare: number
  optionCastShare: number
  designationAmount: number
  designationStoreShare: number
  designationCastShare: number
  transportationFee: number
  additionalFee: number
  discountAmount: number
  storeRevenue: number
  staffRevenue: number
}

const DEFAULT_WELFARE_RATE = 10
const DEFAULT_STORE_RATIO = 0.6

function toNumber(value: unknown): number {
  const num = typeof value === 'string' ? Number(value) : (value as number)
  if (Number.isFinite(num)) {
    return num
  }
  return 0
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min
  if (value > max) return max
  return value
}

function resolveShare(price: number, storeShare?: number | null, castShare?: number | null) {
  const safePrice = Math.max(0, Math.round(price))
  let store = Number.isFinite(storeShare ?? null) ? Math.max(storeShare ?? 0, 0) : Number.NaN
  let cast = Number.isFinite(castShare ?? null) ? Math.max(castShare ?? 0, 0) : Number.NaN

  if (Number.isNaN(store) && Number.isNaN(cast)) {
    store = Math.round(safePrice * DEFAULT_STORE_RATIO)
    cast = Math.max(safePrice - store, 0)
  } else if (Number.isNaN(store)) {
    cast = clamp(cast, 0, safePrice)
    store = Math.max(safePrice - cast, 0)
  } else if (Number.isNaN(cast)) {
    store = clamp(store, 0, safePrice)
    cast = Math.max(safePrice - store, 0)
  } else {
    store = clamp(store, 0, safePrice)
    cast = clamp(cast, 0, safePrice)
    if (store + cast !== safePrice) {
      cast = Math.max(safePrice - store, 0)
    }
  }

  return { store, cast }
}

export function calculateReservationRevenue(
  input: ReservationRevenueInput
): ReservationRevenueResult {
  const basePrice = Math.max(0, Math.round(input.basePrice ?? 0))
  const welfareRateRaw = Number.isFinite(input.welfareRate ?? null) ? (input.welfareRate as number) : null
  const welfareRate = clamp(welfareRateRaw ?? DEFAULT_WELFARE_RATE, 0, 100)
  const welfareExpense = Math.max(Math.round(basePrice * (welfareRate / 100)), 0)

  const { store: courseStoreShare, cast: courseCastShare } = resolveShare(
    basePrice,
    welfareExpense,
    basePrice - welfareExpense
  )

  const options = input.options ?? []
  let optionsTotal = 0
  let optionStoreShare = 0
  let optionCastShare = 0

  for (const option of options) {
    const price = Math.max(0, Math.round(option.price ?? 0))
    optionsTotal += price
    const { store, cast } = resolveShare(price, option.storeShare, option.castShare)
    optionStoreShare += store
    optionCastShare += cast
  }

  const designationAmount = Math.max(0, Math.round(input.designation?.amount ?? 0))
  const { store: designationStoreShare, cast: designationCastShare } = resolveShare(
    designationAmount,
    input.designation?.storeShare,
    input.designation?.castShare
  )

  const transportationFee = Math.max(0, Math.round(toNumber(input.transportationFee)))
  const additionalFee = Math.max(0, Math.round(toNumber(input.additionalFee)))
  const discountAmount = Math.max(0, Math.round(toNumber(input.discountAmount)))

  const total =
    basePrice +
    optionsTotal +
    designationAmount +
    transportationFee +
    additionalFee -
    discountAmount

  const storeRevenue = Math.max(
    courseStoreShare +
      optionStoreShare +
      designationStoreShare +
      transportationFee +
      additionalFee -
      discountAmount,
    welfareExpense
  )

  const staffRevenue = Math.max(courseCastShare + optionCastShare + designationCastShare, 0)

  return {
    total: Math.max(total, 0),
    welfareExpense,
    welfareRate,
    courseStoreShare,
    courseCastShare,
    optionsTotal,
    optionStoreShare,
    optionCastShare,
    designationAmount,
    designationStoreShare,
    designationCastShare,
    transportationFee,
    additionalFee,
    discountAmount,
    storeRevenue,
    staffRevenue,
  }
}
