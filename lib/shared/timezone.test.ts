/**
 * @design_doc   refactor-instructions.md Phase 4 timezone utility coverage
 * @related_to   timezone.ts - shared JST date formatting helpers
 * @known_issues None currently
 */
import { describe, expect, it } from 'vitest'
import { ja } from 'date-fns/locale'

import { formatInJst, JST_TIMEZONE, toUtcFromJst, toZonedJstDate } from './timezone'

describe('shared timezone utilities', () => {
  it('exposes the canonical JST timezone identifier', () => {
    expect(JST_TIMEZONE).toBe('Asia/Tokyo')
  })

  it('formats dates in JST with optional date-fns options', () => {
    const date = new Date('2024-01-14T15:00:00.000Z')

    expect(formatInJst(date, 'yyyy-MM-dd')).toBe('2024-01-15')
    expect(formatInJst(date, '(E)', { locale: ja })).toBe('(月)')
  })

  it('converts local JST date-time strings to UTC dates', () => {
    expect(toUtcFromJst('2024-01-15T10:30:00').toISOString()).toBe('2024-01-15T01:30:00.000Z')
  })

  it('converts UTC dates to their JST wall-clock date', () => {
    const zoned = toZonedJstDate(new Date('2024-01-14T15:00:00.000Z'))

    expect(zoned.getFullYear()).toBe(2024)
    expect(zoned.getMonth()).toBe(0)
    expect(zoned.getDate()).toBe(15)
  })
})
