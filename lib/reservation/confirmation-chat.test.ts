/**
 * @design_doc   refactor-instructions.md Phase 5 reservation route extraction coverage
 * @related_to   confirmation-chat.ts, app/api/reservation/route.ts
 * @known_issues None currently
 */
import { describe, expect, it } from 'vitest'

import {
  buildReservationConfirmationChatContent,
  formatChatAmount,
  resolveReservationTotalAmount,
} from './confirmation-chat'

describe('reservation confirmation chat helpers', () => {
  it('formats finite totals and falls back when no amount is available', () => {
    expect(formatChatAmount(32000)).toBe('32,000円')
    expect(formatChatAmount(null)).toBe('店舗より別途ご案内いたします')
    expect(formatChatAmount(Number.NaN)).toBe('店舗より別途ご案内いたします')
  })

  it('resolves reservation totals using the current precedence order', () => {
    expect(resolveReservationTotalAmount({ price: 32000, storeRevenue: 1, staffRevenue: 2 })).toBe(
      32000
    )
    expect(resolveReservationTotalAmount({ storeRevenue: 12000, staffRevenue: 20000 })).toBe(32000)
    expect(resolveReservationTotalAmount({ storeRevenue: 12000 })).toBe(12000)
    expect(resolveReservationTotalAmount({ staffRevenue: 20000 })).toBe(20000)
    expect(resolveReservationTotalAmount({ course: { price: 28000 } })).toBe(28000)
    expect(resolveReservationTotalAmount({})).toBeNull()
  })

  it('builds the existing Japanese confirmation message with a trimmed phone number', () => {
    const content = buildReservationConfirmationChatContent('32,000円', ' 03-1234-5678 ')

    expect(content).toContain('この度はネット予約をご利用いただき誠にありがとうございます。')
    expect(content).toContain('お支払総額：32,000円（ホテル代別途）')
    expect(content).toContain('TEL：03-1234-5678')
    expect(content).toContain('・トキワウエスト')
  })

  it('uses the existing fallback phone line when the store phone is blank', () => {
    expect(buildReservationConfirmationChatContent('32,000円', '')).toContain(
      'TEL：店舗までお問い合わせください'
    )
  })
})
