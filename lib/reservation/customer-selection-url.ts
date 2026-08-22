/**
 * @design_doc   会議未確定: 顧客解除後に別顧客を選び直せる
 * @related_to   ReservationPageContent handleCustomerSelection
 * @known_issues None
 */
export function buildReservationCustomerSelectionHref(
  pathname: string,
  search: string,
  customerId: string | null
): string {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  if (customerId) {
    params.set('customerId', customerId)
  } else {
    params.delete('customerId')
  }
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}
