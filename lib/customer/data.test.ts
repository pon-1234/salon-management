import { describe, it, expect, vi, beforeEach } from 'vitest'
import { customers, getCustomerUsageHistory, getCustomerPointHistory } from './data'

describe('Customer Data', () => {
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
        expect(customer).toHaveProperty('nameKana')
        expect(customer).toHaveProperty('phone')
        expect(customer).toHaveProperty('email')
        expect(customer).toHaveProperty('password')
        expect(customer).toHaveProperty('birthDate')
        expect(customer).toHaveProperty('age')
        expect(customer).toHaveProperty('memberType')
        expect(customer).toHaveProperty('smsEnabled')
        expect(customer).toHaveProperty('points')
        expect(customer).toHaveProperty('registrationDate')
        expect(customer).toHaveProperty('lastVisitDate')
        expect(customer).toHaveProperty('notes')
        expect(customer).toHaveProperty('createdAt')
        expect(customer).toHaveProperty('updatedAt')
      })
    })

    it('should have valid dates', () => {
      customers.forEach((customer) => {
        expect(customer.birthDate).toBeInstanceOf(Date)
        expect(customer.registrationDate).toBeInstanceOf(Date)
        expect(customer.lastVisitDate).toBeInstanceOf(Date)
        expect(customer.createdAt).toBeInstanceOf(Date)
        expect(customer.updatedAt).toBeInstanceOf(Date)
      })
    })
  })

  describe('getCustomerUsageHistory', () => {
    it('should return customer usage history', async () => {
      const history = await getCustomerUsageHistory('1')

      expect(Array.isArray(history)).toBe(true)
      expect(history.length).toBeGreaterThan(0)
    }, 10000)

    it('should have valid usage record structure', async () => {
      const history = await getCustomerUsageHistory('1')

      history.forEach((record) => {
        expect(record).toHaveProperty('id')
        expect(record).toHaveProperty('date')
        expect(record).toHaveProperty('serviceName')
        expect(record).toHaveProperty('staffName')
        expect(record).toHaveProperty('amount')
        expect(record).toHaveProperty('status')
        expect(record.date).toBeInstanceOf(Date)
        expect(typeof record.amount).toBe('number')
      })
    }, 10000)

    it('should return different statuses', async () => {
      const history = await getCustomerUsageHistory('1')
      const statuses = [...new Set(history.map((h) => h.status))]

      expect(statuses.length).toBeGreaterThan(1)
      expect(statuses).toContain('completed')
    }, 10000)
  })

  describe('getCustomerPointHistory', () => {
    it('should return customer point history', async () => {
      const history = await getCustomerPointHistory('1')

      expect(Array.isArray(history)).toBe(true)
      expect(history.length).toBeGreaterThan(0)
    }, 10000)

    it('should have valid point history structure', async () => {
      const history = await getCustomerPointHistory('1')

      history.forEach((record) => {
        expect(record).toHaveProperty('id')
        expect(record).toHaveProperty('date')
        expect(record).toHaveProperty('type')
        expect(record).toHaveProperty('amount')
        expect(record).toHaveProperty('description')
        expect(record).toHaveProperty('balance')
        expect(record.date).toBeInstanceOf(Date)
        expect(typeof record.amount).toBe('number')
        expect(typeof record.balance).toBe('number')
      })
    }, 10000)

    it('should return sorted by date descending', async () => {
      const history = await getCustomerPointHistory('1')

      for (let i = 1; i < history.length; i++) {
        expect(history[i - 1].date.getTime()).toBeGreaterThanOrEqual(history[i].date.getTime())
      }
    }, 10000)

    it('should have different point types', async () => {
      const history = await getCustomerPointHistory('1')
      const types = [...new Set(history.map((h) => h.type))]

      expect(types.length).toBeGreaterThan(1)
      expect(types).toContain('earned')
      expect(types).toContain('used')
    }, 10000)

    it('should have negative amounts for used/expired points', async () => {
      const history = await getCustomerPointHistory('1')
      const usedOrExpired = history.filter((h) => h.type === 'used' || h.type === 'expired')

      usedOrExpired.forEach((record) => {
        expect(record.amount).toBeLessThan(0)
      })
    }, 10000)

    it('should have positive amounts for earned points', async () => {
      const history = await getCustomerPointHistory('1')
      const earned = history.filter((h) => h.type === 'earned')

      earned.forEach((record) => {
        expect(record.amount).toBeGreaterThan(0)
      })
    }, 10000)
  })
})
