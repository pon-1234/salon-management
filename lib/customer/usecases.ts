import { Customer } from './types'
import { CustomerRepository } from './repository'

export class CustomerUseCases {
  constructor(private repository: CustomerRepository) {}

  async getById(id: string): Promise<Customer | null> {
    return this.repository.getById(id)
  }

  async getCustomerByPhone(phone: string): Promise<Customer | null> {
    return this.repository.getCustomerByPhone(phone)
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
}
