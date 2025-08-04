import { Customer } from './types'

export function calculateAge(birthDate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

/** @no-test-required reason: Unused internal function - not exported or referenced */
function getTotalPoints(customers: Customer[]): number {
  return customers.reduce((total, customer) => total + customer.points, 0)
}

/** @no-test-required reason: Unused internal function - not exported or referenced */
function getTopCustomers(customers: Customer[], limit: number): Customer[] {
  return customers.sort((a, b) => b.points - a.points).slice(0, limit)
}

/** @no-test-required reason: Unused internal function - not exported or referenced */
function calculateCustomerLoyalty(customer: Customer, totalVisits: number): string {
  if (totalVisits > 20) return 'VIP'
  if (totalVisits > 10) return 'Loyal'
  if (totalVisits > 5) return 'Regular'
  return 'New'
}
