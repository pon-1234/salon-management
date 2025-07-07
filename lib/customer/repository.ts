import { Customer } from './types'
import { Repository } from '../shared/types'

export interface CustomerRepository extends Repository<Customer> {
  // Base Repository methods are inherited, so we only need to define custom ones.
  getCustomerByPhone(phone: string): Promise<Customer | null>
  findByEmail(email: string): Promise<Customer | null>
}
