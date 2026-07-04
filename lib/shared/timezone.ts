/**
 * @design_doc   refactor-instructions.md Phase 4 shared timezone utilities
 * @related_to   cast-schedule utils, reservation availability, store public schedule
 * @known_issues Only centralizes existing JST helpers; broader timezone policy is unchanged
 */
import { formatInTimeZone, utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz'

export const JST_TIMEZONE = 'Asia/Tokyo'

type FormatInTimeZoneOptions = NonNullable<Parameters<typeof formatInTimeZone>[3]>

export function formatInJst(
  date: Date | number,
  formatStr: string,
  options?: FormatInTimeZoneOptions
): string {
  return formatInTimeZone(date, JST_TIMEZONE, formatStr, options)
}

export function toUtcFromJst(date: Date | number | string): Date {
  return zonedTimeToUtc(date, JST_TIMEZONE)
}

export function toZonedJstDate(date: Date | number): Date {
  return utcToZonedTime(date, JST_TIMEZONE)
}
