import { Message, Customer } from '../types/chat'
import { messages, customers } from './data'

export function getCustomers(): Customer[] {
  return customers
}
