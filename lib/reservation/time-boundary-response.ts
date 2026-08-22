/**
 * @design_doc   Reservation API response for the shared start-time boundary contract
 * @related_to   app/api/reservation/route.ts and time-boundary.ts
 * @known_issues None
 */
import { NextResponse } from 'next/server'
import { reservationStartBoundaryErrorMessage } from './time-boundary'

export function reservationStartBoundaryErrorResponse(): NextResponse {
  return NextResponse.json({ error: reservationStartBoundaryErrorMessage() }, { status: 400 })
}
