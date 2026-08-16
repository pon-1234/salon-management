/**
 * @design_doc   Reservation option-selection error and HTTP response contract
 * @related_to   app/api/reservation/route.ts and OptionPrice validation
 * @known_issues None
 */
import { NextResponse } from 'next/server'

export class InvalidOptionSelectionError extends Error {
  constructor(readonly missingOptions: string[]) {
    super('Invalid option selection')
    this.name = 'InvalidOptionSelectionError'
  }
}

export function invalidOptionSelectionResponse(error: InvalidOptionSelectionError): NextResponse {
  return NextResponse.json(
    {
      error: '選択されたオプションが存在しません。',
      missingOptions: error.missingOptions,
    },
    { status: 400 }
  )
}
