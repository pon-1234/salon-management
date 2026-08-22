/**
 * @design_doc   docs/LEGACY_GOLD_ADMIN_MIGRATION_INVENTORY.md cast settlement management
 * @related_to   PaymentRecordForm records the operator click time in JST
 * @known_issues None
 */
import { formatInTimeZone, zonedTimeToUtc } from 'date-fns-tz'

const JST_TIME_ZONE = 'Asia/Tokyo'

export function settlementPaidAtParts(now = new Date()) {
  return {
    date: formatInTimeZone(now, JST_TIME_ZONE, 'yyyy-MM-dd'),
    time: formatInTimeZone(now, JST_TIME_ZONE, 'HH:mm'),
  }
}

export function settlementPaidAtIso(date: string, time: string) {
  return zonedTimeToUtc(`${date}T${time}:00`, JST_TIME_ZONE).toISOString()
}
