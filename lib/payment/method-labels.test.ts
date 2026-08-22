/**
 * @design_doc   PAY-06 キャッシュ / 現金精算の表記を現金に統一する
 * @related_to   displayPaymentMethodLabel, displaySettlementMethodLabel
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'

import { displayPaymentMethodLabel, displaySettlementMethodLabel } from './method-labels'

describe('payment method labels', () => {
  it('displays cash aliases as 現金', () => {
    expect(displayPaymentMethodLabel('キャッシュ')).toBe('現金')
    expect(displayPaymentMethodLabel('現金精算')).toBe('現金')
    expect(displayPaymentMethodLabel('cash')).toBe('現金')
    expect(displayPaymentMethodLabel('現金')).toBe('現金')
  })

  it('keeps card labels as クレジットカード', () => {
    expect(displayPaymentMethodLabel('カード')).toBe('クレジットカード')
    expect(displayPaymentMethodLabel('クレジットカード')).toBe('クレジットカード')
  })

  it('stores settlement cash as 現金 while remaining compatible with 現金精算 rows', () => {
    expect(displaySettlementMethodLabel('現金精算')).toBe('現金')
    expect(displaySettlementMethodLabel('現金')).toBe('現金')
    expect(displaySettlementMethodLabel('振込')).toBe('振込')
  })
})
