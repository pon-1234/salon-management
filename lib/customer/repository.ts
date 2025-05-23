import { Customer } from './types';

export interface CustomerRepository {
  getCustomer(id: string): Promise<Customer | null>;
  getCustomerByPhone(phone: string): Promise<Customer | null>;
  getAllCustomers(): Promise<Customer[]>;
  createCustomer(customer: Omit<Customer, 'id'>): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<Customer>): Promise<Customer>;
  deleteCustomer(id: string): Promise<void>;
}
