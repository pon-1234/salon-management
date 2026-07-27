/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md D-1 and D-2
 * @related_to   Reservation modules and domain entrypoint cleanup
 * @known_issues Line-count gates prevent regression while larger screens continue incremental extraction
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  getDesignationFeeAmount,
  normalizeToBusinessMinutes,
} from '@/components/reservation/quick-booking.utils'
import { normalizePaymentMethodInput, parseReservationDate } from '@/lib/reservation/route-utils'
import { PAYMENT_METHODS } from '@/lib/constants'

const root = process.cwd()

function lineCount(path: string): number {
  return readFileSync(join(root, path), 'utf8').split('\n').length
}

describe('phase 4 architecture cleanup', () => {
  it('extracts distinct reservation responsibilities from the largest modules', () => {
    expect(lineCount('components/reservation/reservation-dialog.tsx')).toBeLessThan(3_000)
    expect(lineCount('components/reservation/quick-booking-dialog.tsx')).toBeLessThan(1_700)
    expect(lineCount('app/api/reservation/route.ts')).toBeLessThan(1_900)
  })

  it('removes unused barrels and the obsolete cast schedule data module', () => {
    for (const path of [
      'lib/customer/index.ts',
      'lib/course-option/index.ts',
      'lib/daily-sales/index.ts',
      'lib/reservation/index.ts',
      'lib/cast-schedule/data.ts',
      'lib/cast-schedule/old-data.ts',
    ]) {
      expect(existsSync(join(root, path))).toBe(false)
    }
    expect(existsSync(join(root, 'lib/cast-schedule/fallback-data.ts'))).toBe(true)
  })

  it('keeps extracted quick-booking calculations deterministic', () => {
    expect(
      normalizeToBusinessMinutes('01:30', {
        startMinutes: 600,
        endMinutes: 1_560,
        startLabel: '10:00',
        endLabel: '02:00',
      })
    ).toBe(1_530)
    expect(getDesignationFeeAmount('special', { specialDesignationFee: 4_000 } as never)).toBe(
      4_000
    )
  })

  it('keeps extracted reservation request normalization strict', () => {
    expect(normalizePaymentMethodInput('credit card')).toBe(PAYMENT_METHODS.CARD)
    expect(normalizePaymentMethodInput('crypto')).toBeNull()
    expect(parseReservationDate('2026-07-27 10:30').toISOString()).toBe('2026-07-27T01:30:00.000Z')
  })
})
