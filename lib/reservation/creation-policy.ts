/**
 * @design_doc   Reservation creation authorization policy
 * @related_to   app/api/reservation/route.ts separates public booking input from admin input
 * @known_issues Fee values are resolved by the reservation service after this allowlist step
 */

const CUSTOMER_RESERVATION_FIELDS = [
  'castId',
  'courseId',
  'courseIds',
  'startTime',
  'endTime',
  'options',
  'pointsUsed',
  'paymentMethod',
  'designationType',
  'areaId',
  'stationId',
  'hotelId',
  'hotelName',
  'roomNumber',
  'locationMemo',
  'notes',
] as const

export function sanitizeReservationCreationInput(
  input: Record<string, unknown>,
  isAdmin: boolean
): Record<string, unknown> {
  if (isAdmin) {
    return { ...input }
  }

  const sanitized: Record<string, unknown> = {}
  CUSTOMER_RESERVATION_FIELDS.forEach((field) => {
    if (field === 'designationType') {
      return
    }
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      sanitized[field] = input[field]
    }
  })

  sanitized.designationType = ['none', 'regular', 'special'].includes(String(input.designationType))
    ? input.designationType
    : 'none'
  sanitized.status = 'pending'
  sanitized.marketingChannel = 'WEB'
  return sanitized
}
