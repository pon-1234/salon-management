import { describe, it, expect, vi, beforeEach } from 'vitest'
import { customers, messages } from './data'

describe('Chat Data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('customers', () => {
    it('should export an array of customers', () => {
      expect(Array.isArray(customers)).toBe(true)
      expect(customers.length).toBeGreaterThan(0)
    })

    it('should have valid customer structure', () => {
      customers.forEach((customer) => {
        expect(customer).toHaveProperty('id')
        expect(customer).toHaveProperty('name')
        expect(customer).toHaveProperty('lastMessage')
        expect(customer).toHaveProperty('lastMessageTime')
        expect(customer).toHaveProperty('hasUnread')
        expect(customer).toHaveProperty('unreadCount')
        expect(customer).toHaveProperty('isOnline')
        expect(customer).toHaveProperty('memberType')

        expect(typeof customer.id).toBe('string')
        expect(typeof customer.name).toBe('string')
        expect(typeof customer.lastMessage).toBe('string')
        expect(typeof customer.lastMessageTime).toBe('string')
        expect(typeof customer.hasUnread).toBe('boolean')
        expect(typeof customer.unreadCount).toBe('number')
        expect(typeof customer.isOnline).toBe('boolean')
        expect(['regular', 'vip']).toContain(customer.memberType)

        if (customer.avatar !== undefined) {
          expect(typeof customer.avatar).toBe('string')
        }

        if (customer.lastSeen !== undefined) {
          expect(typeof customer.lastSeen).toBe('string')
        }
      })
    })

    it('should have unique customer IDs', () => {
      const ids = customers.map((customer) => customer.id)
      const uniqueIds = [...new Set(ids)]
      expect(ids.length).toBe(uniqueIds.length)
    })

    it('should have valid unread counts', () => {
      customers.forEach((customer) => {
        if (customer.hasUnread) {
          expect(customer.unreadCount).toBeGreaterThan(0)
        } else {
          expect(customer.unreadCount).toBe(0)
        }
      })
    })

    it('should have lastSeen for most offline customers', () => {
      const offlineCustomers = customers.filter((customer) => !customer.isOnline)
      const withLastSeen = offlineCustomers.filter((customer) => customer.lastSeen !== undefined)

      // At least some offline customers should have lastSeen
      if (offlineCustomers.length > 0) {
        expect(withLastSeen.length).toBeGreaterThan(0)
      }
    })
  })

  describe('messages', () => {
    it('should export an array of messages', () => {
      expect(Array.isArray(messages)).toBe(true)
      expect(messages.length).toBeGreaterThan(0)
    })

    it('should have valid message structure', () => {
      messages.forEach((message) => {
        expect(message).toHaveProperty('id')
        expect(message).toHaveProperty('sender')
        expect(message).toHaveProperty('content')
        expect(message).toHaveProperty('timestamp')
        expect(message).toHaveProperty('customerId')

        expect(typeof message.id).toBe('string')
        expect(['customer', 'staff']).toContain(message.sender)
        expect(typeof message.content).toBe('string')
        expect(typeof message.timestamp).toBe('string')
        expect(typeof message.customerId).toBe('string')

        if (message.readStatus) {
          expect(typeof message.readStatus).toBe('string')
        }

        if (message.isReservationInfo !== undefined) {
          expect(typeof message.isReservationInfo).toBe('boolean')
        }
      })
    })

    it('should have unique message IDs', () => {
      const ids = messages.map((message) => message.id)
      const uniqueIds = [...new Set(ids)]
      expect(ids.length).toBe(uniqueIds.length)
    })

    it('should have valid customer IDs in messages', () => {
      const customerIds = customers.map((c) => c.id)
      messages.forEach((message) => {
        expect(customerIds).toContain(message.customerId)
      })
    })

    it('should have at least one message per sender type', () => {
      const customerMessages = messages.filter((m) => m.sender === 'customer')
      const staffMessages = messages.filter((m) => m.sender === 'staff')

      expect(customerMessages.length).toBeGreaterThan(0)
      expect(staffMessages.length).toBeGreaterThan(0)
    })
  })

  describe('data consistency', () => {
    it('should have consistent customer data in customers array', () => {
      const vipCustomers = customers.filter((c) => c.memberType === 'vip')
      const regularCustomers = customers.filter((c) => c.memberType === 'regular')

      expect(vipCustomers.length).toBeGreaterThan(0)
      expect(regularCustomers.length).toBeGreaterThan(0)
    })

    it('should have messages for customer with id 1', () => {
      const customerMessages = messages.filter((m) => m.customerId === '1')
      expect(customerMessages.length).toBeGreaterThan(0)
    })
  })
})
