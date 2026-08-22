/**
 * @design_doc   会議未確定: 顧客解除後に別顧客を選び直せる
 * @related_to   reservation-page-content handleCustomerSelection
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'
import { buildReservationCustomerSelectionHref } from './customer-selection-url'

describe('buildReservationCustomerSelectionHref', () => {
  it('stores the selected customer in the reservation query', () => {
    expect(
      buildReservationCustomerSelectionHref('/admin/reservation', 'view=timeline', 'cust-1')
    ).toBe('/admin/reservation?view=timeline&customerId=cust-1')
  })

  it('removes customerId so unbind is not overwritten by the previous URL', () => {
    expect(
      buildReservationCustomerSelectionHref(
        '/admin/reservation',
        '?customerId=cust-1&store=ikebukuro',
        null
      )
    ).toBe('/admin/reservation?store=ikebukuro')
  })

  it('returns a bare pathname when unbind clears the last query value', () => {
    expect(
      buildReservationCustomerSelectionHref('/admin/reservation', 'customerId=cust-1', null)
    ).toBe('/admin/reservation')
  })
})
