/**
 * @design_doc   Reservation API response for the shared start-time boundary contract
 * @related_to   app/api/reservation/route.ts and time-boundary.ts
 * @known_issues None
 */
import { NextResponse } from 'next/server'

export function reservationStartBoundaryErrorResponse(): NextResponse {
  return NextResponse.json(
    { error: '開始時間は30分単位（00分・30分）で指定してください。' },
    { status: 400 }
  )
}
