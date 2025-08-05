import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CustomerRepositoryImpl } from './repository-impl'
import { Customer } from './types'

// Mock fetch globally
global.fetch = vi.fn()

describe('CustomerRepositoryImpl', () => {
  let repository: CustomerRepositoryImpl
  let consoleWarnSpy: any

  beforeEach(() => {
    vi.clearAllMocks()
    repository = new CustomerRepositoryImpl()
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const mockCustomer: Customer = {
    id: '1',
    name: '山田太郎',
    nameKana: 'ヤマダタロウ',
    email: 'yamada@example.com',
    phone: '090-1234-5678',
    password: 'hashedpassword',
    birthDate: new Date('1990-01-01'),
    age: 34,
    memberType: 'vip',
    smsEnabled: true,
    points: 100,
    registrationDate: new Date('2023-01-01'),
    lastVisitDate: new Date('2024-01-01'),
    notes: 'VIP顧客',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  }

  describe('getAll', () => {
    it('should fetch all customers successfully', async () => {
      const mockCustomers = [mockCustomer]
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCustomers,
      } as Response)

      const result = await repository.getAll()

      expect(fetch).toHaveBeenCalledWith('/api/customer')
      expect(result).toEqual(mockCustomers)
    })

    it('should throw error when fetch fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
      } as Response)

      await expect(repository.getAll()).rejects.toThrow('Failed to fetch customers')
    })
  })

  describe('getById', () => {
    it('should fetch customer by id successfully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCustomer,
      } as Response)

      const result = await repository.getById('1')

      expect(fetch).toHaveBeenCalledWith('/api/customer?id=1')
      expect(result).toEqual(mockCustomer)
    })

    it('should return null for 404 response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)

      const result = await repository.getById('999')

      expect(result).toBeNull()
    })

    it('should throw error for other failures', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response)

      await expect(repository.getById('1')).rejects.toThrow('Failed to fetch customer')
    })
  })

  describe('getCustomerByPhone', () => {
    it('should return null and log warning', async () => {
      const result = await repository.getCustomerByPhone('090-1234-5678')

      expect(result).toBeNull()
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'getCustomerByPhone is not implemented on the API yet.'
      )
    })
  })

  describe('findByEmail', () => {
    it('should fetch customer by email successfully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCustomer,
      } as Response)

      const result = await repository.findByEmail('yamada@example.com')

      expect(fetch).toHaveBeenCalledWith('/api/customer/by-email/yamada%40example.com')
      expect(result).toEqual(mockCustomer)
    })

    it('should return null for 404 response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)

      const result = await repository.findByEmail('notfound@example.com')

      expect(result).toBeNull()
    })

    it('should throw error for other failures', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response)

      await expect(repository.findByEmail('error@example.com')).rejects.toThrow(
        'Failed to fetch customer by email'
      )
    })

    it('should properly encode email with special characters', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCustomer,
      } as Response)

      await repository.findByEmail('test+tag@example.com')

      expect(fetch).toHaveBeenCalledWith('/api/customer/by-email/test%2Btag%40example.com')
    })
  })

  describe('create', () => {
    it('should create customer successfully', async () => {
      const newCustomerData = {
        name: '新規顧客',
        nameKana: 'シンキコキャク',
        email: 'new@example.com',
        phone: '090-9876-5432',
        password: 'password123',
        birthDate: new Date('1995-05-05'),
        age: 29,
        memberType: 'regular' as const,
        smsEnabled: false,
        points: 0,
        registrationDate: new Date('2024-01-01'),
        notes: '',
      }

      const createdCustomer = {
        ...newCustomerData,
        id: '2',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => createdCustomer,
      } as Response)

      const result = await repository.create(newCustomerData)

      expect(fetch).toHaveBeenCalledWith('/api/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomerData),
      })
      expect(result).toEqual(createdCustomer)
    })

    it('should throw error when create fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
      } as Response)

      await expect(
        repository.create({
          name: 'Test',
          nameKana: 'テスト',
          email: 'test@example.com',
          phone: '090-0000-0000',
          password: 'password123',
          birthDate: new Date('2000-01-01'),
          age: 24,
          memberType: 'regular',
          smsEnabled: false,
          points: 0,
          registrationDate: new Date(),
          notes: '',
        })
      ).rejects.toThrow('Failed to create customer')
    })
  })

  describe('update', () => {
    it('should update customer successfully', async () => {
      const updateData = { name: '更新太郎', points: 200 }
      const updatedCustomer = { ...mockCustomer, ...updateData }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedCustomer,
      } as Response)

      const result = await repository.update('1', updateData)

      expect(fetch).toHaveBeenCalledWith('/api/customer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: '1', ...updateData }),
      })
      expect(result).toEqual(updatedCustomer)
    })

    it('should throw error when update fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
      } as Response)

      await expect(repository.update('1', { name: 'Test' })).rejects.toThrow(
        'Failed to update customer'
      )
    })
  })

  describe('delete', () => {
    it('should delete customer successfully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
      } as Response)

      const result = await repository.delete('1')

      expect(fetch).toHaveBeenCalledWith('/api/customer?id=1', {
        method: 'DELETE',
      })
      expect(result).toBe(true)
    })

    it('should return false when delete fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
      } as Response)

      const result = await repository.delete('1')

      expect(result).toBe(false)
    })
  })
})
