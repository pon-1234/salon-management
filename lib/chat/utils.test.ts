import { describe, it, expect, vi } from 'vitest'
import { getCustomers } from './utils'
import { customers } from './data'

vi.mock('./data', () => ({
  customers: [
    {
      id: '1',
      name: 'Test Customer 1',
      lastMessage: 'Hello',
      unreadCount: 2,
      lastMessageTime: '2024-01-01T10:00:00Z',
      phoneNumber: '090-1234-5678',
    },
    {
      id: '2',
      name: 'Test Customer 2',
      lastMessage: 'Hi there',
      unreadCount: 0,
      lastMessageTime: '2024-01-01T11:00:00Z',
      phoneNumber: '090-8765-4321',
    },
  ],
  messages: [],
}))

describe('Chat Utils', () => {
  describe('getCustomers', () => {
    it('should return all customers from data', () => {
      const result = getCustomers()

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: '1',
        name: 'Test Customer 1',
        lastMessage: 'Hello',
        unreadCount: 2,
        lastMessageTime: '2024-01-01T10:00:00Z',
        phoneNumber: '090-1234-5678',
      })
      expect(result[1]).toEqual({
        id: '2',
        name: 'Test Customer 2',
        lastMessage: 'Hi there',
        unreadCount: 0,
        lastMessageTime: '2024-01-01T11:00:00Z',
        phoneNumber: '090-8765-4321',
      })
    })

    it('should return the same array reference from data', () => {
      const result1 = getCustomers()
      const result2 = getCustomers()

      expect(result1).toBe(result2)
    })
  })
})
