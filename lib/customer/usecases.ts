import { Customer } from './types';
import { CustomerRepository } from './repository';

export class CustomerUseCases {
  constructor(private repository: CustomerRepository) {}

  async getCustomer(id: string): Promise<Customer | null> {
    return this.repository.getCustomer(id);
  }

  async getCustomerByPhone(phone: string): Promise<Customer | null> {
    return this.repository.getCustomerByPhone(phone);
  }

  async getAllCustomers(): Promise<Customer[]> {
    return this.repository.getAllCustomers();
  }

  async createCustomer(customer: Omit<Customer, 'id'>): Promise<Customer> {
    return this.repository.createCustomer(customer);
  }

  async updateCustomer(id: string, customer: Partial<Customer>): Promise<Customer> {
    return this.repository.updateCustomer(id, customer);
  }

  async deleteCustomer(id: string): Promise<void> {
    return this.repository.deleteCustomer(id);
  }
}
