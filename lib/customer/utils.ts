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

export function getTotalPoints(customers: Customer[]): number {
  return customers.reduce((total, customer) => total + customer.points, 0)
}

export function getTopCustomers(customers: Customer[], limit: number): Customer[] {
  return customers.sort((a, b) => b.points - a.points).slice(0, limit)
}

export function calculateCustomerLoyalty(customer: Customer, totalVisits: number): string {
  if (totalVisits > 20) return 'VIP'
  if (totalVisits > 10) return 'Loyal'
  if (totalVisits > 5) return 'Regular'
  return 'New'
}
