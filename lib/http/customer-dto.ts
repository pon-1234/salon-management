/**
 * @design_doc   Customer-facing API response boundaries
 * @related_to   Reservation API and Customer API customer-role responses
 * @known_issues None currently
 */

type UnknownRecord = Record<string, unknown>

const CUSTOMER_FIELDS = [
  'id',
  'name',
  'nameKana',
  'phone',
  'email',
  'birthDate',
  'memberType',
  'points',
  'smsEnabled',
  'emailNotificationEnabled',
  'emailVerified',
  'phoneVerified',
  'phoneVerifiedAt',
  'createdAt',
  'updatedAt',
  'registrationDate',
  'lastLoginDate',
  'lastVisitDate',
  'image',
  'visitCount',
  'lastVisit',
] as const

const RESERVATION_FIELDS = [
  'id',
  'customerId',
  'castId',
  'courseId',
  'startTime',
  'endTime',
  'status',
  'price',
  'storeId',
  'designationType',
  'designationFee',
  'transportationFee',
  'additionalFee',
  'discountAmount',
  'paymentMethod',
  'areaId',
  'stationId',
  'hotelName',
  'roomNumber',
  'locationMemo',
  'notes',
  'pointsUsed',
  'cancellationSource',
  'modifiableUntil',
  'createdAt',
  'updatedAt',
] as const

const PUBLIC_CAST_FIELDS = [
  'id',
  'name',
  'age',
  'height',
  'bust',
  'waist',
  'hip',
  'type',
  'image',
  'images',
  'description',
  'publicProfile',
  'netReservation',
  'requestAttendanceEnabled',
  'specialDesignationFee',
  'regularDesignationFee',
  'panelDesignationRank',
  'regularDesignationRank',
  'workStatus',
  'availableOptions',
  'storeId',
] as const

const COURSE_FIELDS = ['id', 'name', 'duration', 'price', 'description'] as const

const OPTION_FIELDS = [
  'id',
  'name',
  'description',
  'price',
  'duration',
  'category',
  'note',
] as const

const RESERVATION_OPTION_FIELDS = ['id', 'optionId', 'optionName', 'optionPrice'] as const

const AREA_FIELDS = ['id', 'name', 'prefecture', 'city', 'description'] as const
const STATION_FIELDS = [
  'id',
  'name',
  'line',
  'transportationFee',
  'travelTime',
  'description',
] as const
const NG_CAST_FIELDS = ['castId', 'assignedAt'] as const
const REVIEW_FIELDS = [
  'id',
  'castId',
  'reservationId',
  'rating',
  'comment',
  'status',
  'publishedAt',
  'createdAt',
  'updatedAt',
] as const

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  return value as UnknownRecord
}

function pick(source: UnknownRecord, fields: readonly string[]): UnknownRecord {
  const result: UnknownRecord = {}
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(source, field)) {
      result[field] = source[field]
    }
  }
  return result
}

function sanitizePublicCast(value: unknown): UnknownRecord | null {
  const source = asRecord(value)
  return source ? pick(source, PUBLIC_CAST_FIELDS) : null
}

function sanitizeCourse(value: unknown): UnknownRecord | null {
  const source = asRecord(value)
  return source ? pick(source, COURSE_FIELDS) : null
}

function sanitizeOption(value: unknown): UnknownRecord | null {
  const source = asRecord(value)
  return source ? pick(source, OPTION_FIELDS) : null
}

function sanitizeCustomerSummary(value: unknown): UnknownRecord | null {
  const source = asRecord(value)
  return source ? pick(source, CUSTOMER_FIELDS) : null
}

function assignRelation(
  target: UnknownRecord,
  source: UnknownRecord,
  key: string,
  sanitize: (value: unknown) => UnknownRecord | null
): void {
  if (!Object.prototype.hasOwnProperty.call(source, key)) {
    return
  }
  target[key] = source[key] === null ? null : sanitize(source[key])
}

function sanitizeReservationOption(value: unknown): UnknownRecord | null {
  const source = asRecord(value)
  if (!source) {
    return null
  }

  const result = pick(source, RESERVATION_OPTION_FIELDS)
  assignRelation(result, source, 'option', sanitizeOption)
  return result
}

function sanitizeReservation(value: unknown): UnknownRecord | null {
  const source = asRecord(value)
  if (!source) {
    return null
  }

  const result = pick(source, RESERVATION_FIELDS)
  assignRelation(result, source, 'customer', sanitizeCustomerSummary)
  assignRelation(result, source, 'cast', sanitizePublicCast)
  assignRelation(result, source, 'course', sanitizeCourse)
  assignRelation(result, source, 'area', (area) => {
    const record = asRecord(area)
    return record ? pick(record, AREA_FIELDS) : null
  })
  assignRelation(result, source, 'station', (station) => {
    const record = asRecord(station)
    return record ? pick(record, STATION_FIELDS) : null
  })

  if (Array.isArray(source.options)) {
    result.options = source.options
      .map(sanitizeReservationOption)
      .filter((option): option is UnknownRecord => option !== null)
  }

  return result
}

/**
 * Converts one reservation or a reservation list to the explicit customer-facing contract.
 */
export function sanitizeCustomerReservationResponse<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map(sanitizeReservation)
      .filter((reservation): reservation is UnknownRecord => reservation !== null) as T
  }
  return sanitizeReservation(value) as T
}

function sanitizeNgCast(value: unknown): UnknownRecord | null {
  const source = asRecord(value)
  if (!source) {
    return null
  }
  const result = pick(source, NG_CAST_FIELDS)
  assignRelation(result, source, 'cast', sanitizePublicCast)
  return result
}

function sanitizeReview(value: unknown): UnknownRecord | null {
  const source = asRecord(value)
  if (!source) {
    return null
  }
  const result = pick(source, REVIEW_FIELDS)
  assignRelation(result, source, 'cast', sanitizePublicCast)
  return result
}

/**
 * Converts a customer record to the explicit self-service contract, including safe relations.
 */
export function sanitizeCustomerSelfResponse<T>(value: T): T {
  const source = asRecord(value)
  if (!source) {
    return value
  }

  const result = pick(source, CUSTOMER_FIELDS)
  if (Array.isArray(source.ngCasts)) {
    result.ngCasts = source.ngCasts
      .map(sanitizeNgCast)
      .filter((entry): entry is UnknownRecord => entry !== null)
  }
  if (Array.isArray(source.reservations)) {
    result.reservations = sanitizeCustomerReservationResponse(source.reservations)
  }
  if (Array.isArray(source.reviews)) {
    result.reviews = source.reviews
      .map(sanitizeReview)
      .filter((review): review is UnknownRecord => review !== null)
  }

  return result as T
}
