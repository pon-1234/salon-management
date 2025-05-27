import { Repository } from '../shared';
import { Customer } from './types';

export interface CustomerRepository extends Repository<Customer> {
  getCustomerByPhone(phone: string): Promise<Customer | null>;
}
