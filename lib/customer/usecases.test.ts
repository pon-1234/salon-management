import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'
import { CustomerUseCases } from './usecases'
import { CustomerRepository } from './repository'
import { Customer } from './types'

// Mock CustomerRepository
const mockCustomerRepository: CustomerRepository = {
  getById: vi.fn(),
  getAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  getCustomerByPhone: vi.fn(),
  searchByPhone: vi.fn(),
  findByEmail: vi.fn(),
  getInsights: vi.fn(),
}

describe('CustomerUseCases', () => {
  let customerUseCases: CustomerUseCases

  beforeEach(() => {
    customerUseCases = new CustomerUseCases(mockCustomerRepository)
    vi.clearAllMocks()
  })

  describe('getById', () => {
    it("should call repository's getById and return a customer", async () => {
      const customerId = 'cust1'
      const mockCustomer: Partial<Customer> = { id: customerId, name: 'Test Customer' }
      ;(mockCustomerRepository.getById as Mock).mockResolvedValue(mockCustomer as Customer)

      const result = await customerUseCases.getById(customerId)

      expect(mockCustomerRepository.getById).toHaveBeenCalledWith(customerId)
      expect(result).toEqual(mockCustomer)
    })
  })

  describe('getCustomerByPhone', () => {
    it("should call repository's getCustomerByPhone and return a customer", async () => {
      const phone = '09012345678'
      const mockCustomer: Partial<Customer> = { id: 'cust1', phone: phone }
      ;(mockCustomerRepository.getCustomerByPhone as Mock).mockResolvedValue(
        mockCustomer as Customer
      )

      const result = await customerUseCases.getCustomerByPhone(phone)

      expect(mockCustomerRepository.getCustomerByPhone).toHaveBeenCalledWith(phone)
      expect(result).toEqual(mockCustomer)
    })
  })

  describe('getAll', () => {
    it("should call repository's getAll and return all customers", async () => {
      const mockCustomers: Partial<Customer>[] = [{ id: 'cust1' }, { id: 'cust2' }]
      ;(mockCustomerRepository.getAll as Mock).mockResolvedValue(mockCustomers as Customer[])

      const result = await customerUseCases.getAll()

      expect(mockCustomerRepository.getAll).toHaveBeenCalled()
      expect(result).toEqual(mockCustomers)
    })
  })

  describe('create', () => {
    it("should call repository's create with correct data", async () => {
      const newCustomerData = { name: 'New Customer' } as Omit<
        Customer,
        'id' | 'createdAt' | 'updatedAt'
      >
      const createdCustomer: Partial<Customer> = { id: 'cust-new', ...newCustomerData }
      ;(mockCustomerRepository.create as Mock).mockResolvedValue(createdCustomer as Customer)

      const result = await customerUseCases.create(newCustomerData)

      expect(mockCustomerRepository.create).toHaveBeenCalledWith(newCustomerData)
      expect(result).toEqual(createdCustomer)
    })
  })

  describe('update', () => {
    it("should call repository's update with correct data", async () => {
      const customerId = 'cust1'
      const customerUpdateData: Partial<Customer> = { name: 'Updated Name' }
      const updatedCustomer: Partial<Customer> = { id: customerId, ...customerUpdateData }
      ;(mockCustomerRepository.update as Mock).mockResolvedValue(updatedCustomer as Customer)

      const result = await customerUseCases.update(customerId, customerUpdateData)

      expect(mockCustomerRepository.update).toHaveBeenCalledWith(customerId, customerUpdateData)
      expect(result).toEqual(updatedCustomer)
    })
  })

  describe('delete', () => {
    it("should call repository's delete with correct id", async () => {
      const customerId = 'cust1'
      ;(mockCustomerRepository.delete as Mock).mockResolvedValue(true)

      await customerUseCases.delete(customerId)

      expect(mockCustomerRepository.delete).toHaveBeenCalledWith(customerId)
    })
  })

  describe('searchByPhone', () => {
    it("should call repository's searchByPhone and return customers", async () => {
      const phone = '090'
      const customers: Partial<Customer>[] = [{ id: 'cust1', phone: '09012345678' }]
      ;(mockCustomerRepository.searchByPhone as Mock).mockResolvedValue(customers as Customer[])

      const result = await customerUseCases.searchByPhone(phone)

      expect(mockCustomerRepository.searchByPhone).toHaveBeenCalledWith(phone)
      expect(result).toEqual(customers)
    })
  })

  describe('getInsights', () => {
    it("should call repository's getInsights and return insights", async () => {
      const customerId = 'cust1'
      const insights = {
        lastVisitDate: null,
        lastCastName: null,
        totalVisits: 0,
        totalRevenue: 0,
        averageSpend: 0,
        averageIntervalDays: null,
        customerCancelCount: 0,
        storeCancelCount: 0,
        chatCountToday: 0,
        chatCountYesterday: 0,
        chatCountTotal: 0,
        preferredBustCup: null,
        cancellationLimit: 3,
      }
      ;(mockCustomerRepository.getInsights as Mock).mockResolvedValue(insights)

      const result = await customerUseCases.getInsights(customerId)

      expect(mockCustomerRepository.getInsights).toHaveBeenCalledWith(customerId)
      expect(result).toEqual(insights)
    })
  })
})
