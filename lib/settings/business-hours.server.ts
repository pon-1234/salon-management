/**
 * @design_doc   Server-only helpers for business hours configuration
 * @related_to   lib/settings/business-hours.ts, app/api/reservation/availability/route.ts
 * @known_issues None
 */

import { env } from '@/lib/config/env'
import { DEFAULT_BUSINESS_HOURS, parseBusinessHoursString, type BusinessHoursRange } from './business-hours'

const FALLBACK_RANGE = DEFAULT_BUSINESS_HOURS

export function getConfiguredBusinessHours(): BusinessHoursRange {
  const start = env.businessHours.start ?? FALLBACK_RANGE.startLabel
  const end = env.businessHours.end ?? FALLBACK_RANGE.endLabel
  return parseBusinessHoursString(`${start} - ${end}`, FALLBACK_RANGE)
}
