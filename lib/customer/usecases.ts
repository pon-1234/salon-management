/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md customer data verification
 * @related_to   CustomerRepository supplies customer records and store-scoped insights
 * @known_issues None
 */
import { Customer, CustomerInsights } from './types'
import { CustomerRepository } from './repository'

export class CustomerUseCases {
  constructor(private repository: CustomerRepository) {}

  async getById(id: string): Promise<Customer | null> {
    return this.repository.getById(id)
  }

  async getCustomerByPhone(phone: string): Promise<Customer | null> {
    return this.repository.getCustomerByPhone(phone)
  }

  async searchByPhone(phone: string): Promise<Customer[]> {
    return this.repository.searchByPhone(phone)
  }

  async search(query: string): Promise<Customer[]> {
    return this.repository.search(query)
  }

  async getAll(): Promise<Customer[]> {
    return this.repository.getAll()
  }

  async create(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
    return this.repository.create(customer)
  }

  async update(id: string, customer: Partial<Customer>): Promise<Customer | null> {
    return this.repository.update(id, customer)
  }

  async delete(id: string): Promise<boolean> {
    return this.repository.delete(id)
  }

  async getInsights(customerId: string, storeId: string): Promise<CustomerInsights> {
    return this.repository.getInsights(customerId, storeId)
  }
}
