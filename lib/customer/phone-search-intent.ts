/**
 * @design_doc   CST-02 上部メニューの電話番号検索結果の分岐
 * @related_to   dashboard phone lookup and CustomerSelectionDialog
 * @known_issues None
 */
import { normalizePhoneQuery } from './utils'

export type PhoneSearchMatch = {
  id: string
  name: string
  phone: string
}

export type PhoneSearchIntent<T extends PhoneSearchMatch = PhoneSearchMatch> =
  | { type: 'invalid' }
  | { type: 'no-match' }
  | { type: 'register'; phone: string }
  | { type: 'show-customer'; customer: T }
  | { type: 'show-list'; customers: T[] }

export function resolvePhoneSearchIntent<T extends PhoneSearchMatch>(
  query: string,
  customers: T[]
): PhoneSearchIntent<T> {
  const digits = normalizePhoneQuery(query)
  if (digits.length < 3) {
    return { type: 'invalid' }
  }

  if (customers.length === 1) {
    return { type: 'show-customer', customer: customers[0] }
  }

  if (customers.length > 1) {
    return { type: 'show-list', customers }
  }

  if (digits.length >= 10) {
    return { type: 'register', phone: digits }
  }

  return { type: 'no-match' }
}
