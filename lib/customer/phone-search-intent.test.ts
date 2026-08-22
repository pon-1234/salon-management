/**
 * @design_doc   CST-02 上部メニューの電話番号検索結果の分岐
 * @related_to   resolvePhoneSearchIntent
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'

import { resolvePhoneSearchIntent } from './phone-search-intent'

const customer = { id: 'c1', name: '山田', phone: '+819012345678' }

describe('resolvePhoneSearchIntent', () => {
  it('rejects a query that is not a usable phone number', () => {
    expect(resolvePhoneSearchIntent('12', [])).toEqual({ type: 'invalid' })
  })

  it('opens the matching customer when exactly one record is found', () => {
    expect(resolvePhoneSearchIntent('09012345678', [customer])).toEqual({
      type: 'show-customer',
      customer,
    })
  })

  it('lists matches when more than one customer shares the phone fragment', () => {
    const second = { ...customer, id: 'c2', name: '佐藤' }
    expect(resolvePhoneSearchIntent('090', [customer, second])).toEqual({
      type: 'show-list',
      customers: [customer, second],
    })
  })

  it('routes a complete unmatched phone to new customer registration', () => {
    expect(resolvePhoneSearchIntent('09012345678', [])).toEqual({
      type: 'register',
      phone: '09012345678',
    })
  })

  it('keeps a short unmatched query as no-match instead of registration', () => {
    expect(resolvePhoneSearchIntent('09012', [])).toEqual({ type: 'no-match' })
  })
})
