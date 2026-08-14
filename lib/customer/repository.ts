/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md customer data verification
 * @related_to   CustomerRepositoryImpl provides the HTTP-backed implementation
 * @known_issues None
 */
import { Customer, CustomerInsights } from './types'
import { Repository } from '../shared/types'

export interface CustomerRepository extends Repository<Customer> {
  // Base Repository methods are inherited, so we only need to define custom ones.
  getCustomerByPhone(phone: string): Promise<Customer | null>
  search(query: string): Promise<Customer[]>
  searchByPhone(phone: string): Promise<Customer[]>
  findByEmail(email: string): Promise<Customer | null>
  getInsights(customerId: string, storeId: string): Promise<CustomerInsights>
}
