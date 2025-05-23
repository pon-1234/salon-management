import { Message, Customer } from '../types/chat'
import { messages, customers } from './data'

export function getMessages(customerId: string): Message[] {
  return messages.filter(message => message.customerId === customerId);
}

export function getCustomers(): Customer[] {
  return customers
}

export function addMessage(newMessage: Omit<Message, 'id'> & { customerId: string }): Message {
  const id = (messages.length + 1).toString()
  const message: Message = { ...newMessage, id }
  messages.push(message)
  return message
}

export function markMessageAsRead(messageId: string): void {
  const message = messages.find(m => m.id === messageId)
  if (message) {
    message.readStatus = "既読"
  }
}
