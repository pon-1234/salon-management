import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CustomerRepositoryImpl } from './repository-impl'
import { Customer } from './types'

vi.mock('@/lib/http/base-url', () => ({
  resolveApiUrl: (path: string) => path,
}))

const rawCustomer = {
  id: 'cust_1',
  name: '山田 太郎',
  nameKana: 'ヤマダ タロウ',
  phone: '09012345678',
  email: 'taro@example.com',
  password: 'hashed',
  birthDate: '1990-01-01T00:00:00.000Z',
  memberType: 'vip',
  points: 1200,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-10T00:00:00.000Z',
}

describe('CustomerRepositoryImpl', () => {
  let repository: CustomerRepositoryImpl

  beforeEach(() => {
    global.fetch = vi.fn()
    repository = new CustomerRepositoryImpl()
  })

  const mockFetch = (response: Partial<Response>) => {
    vi.mocked(fetch).mockResolvedValue(response as Response)
  }

  const expectCustomer = (customer: Customer) => {
    expect(customer.id).toBe(rawCustomer.id)
    expect(customer.phone).toBe(rawCustomer.phone)
    expect(customer.name).toBe(rawCustomer.name)
    expect(customer.points).toBe(rawCustomer.points)
    expect(customer.memberType).toBe('vip')
    expect(customer.birthDate).toBeInstanceOf(Date)
  }

  it('getAll returns deserialized customers', async () => {
    mockFetch({
      ok: true,
      json: async () => [rawCustomer],
    })

    const customers = await repository.getAll()
    expect(fetch).toHaveBeenCalledWith('/api/customer', { credentials: 'include' })
    expect(customers).toHaveLength(1)
    expectCustomer(customers[0])
  })

  it('getById returns customer', async () => {
    mockFetch({
      ok: true,
      json: async () => rawCustomer,
    })

    const customer = await repository.getById('cust_1')
    expect(fetch).toHaveBeenCalledWith('/api/customer?id=cust_1', { credentials: 'include' })
    expect(customer).not.toBeNull()
    expectCustomer(customer!)
  })

  it('getById returns null on 404', async () => {
    mockFetch({
      ok: false,
      status: 404,
    })

    const customer = await repository.getById('missing')
    expect(customer).toBeNull()
  })

  it('searchByPhone queries API and returns customers', async () => {
    mockFetch({
      ok: true,
      json: async () => [rawCustomer],
    })

    const customers = await repository.searchByPhone('090-1234-5678')
    expect(fetch).toHaveBeenCalledWith('/api/customer?phone=09012345678', {
      credentials: 'include',
    })
    expect(customers).toHaveLength(1)
    expectCustomer(customers[0])
  })

  it('getCustomerByPhone returns first exact match', async () => {
    mockFetch({
      ok: true,
      json: async () => [rawCustomer],
    })

    const customer = await repository.getCustomerByPhone('09012345678')
    expect(customer).not.toBeNull()
    expectCustomer(customer!)
  })

  it('getCustomerByPhone returns null when not found', async () => {
    mockFetch({
      ok: true,
      json: async () => [],
    })

    const customer = await repository.getCustomerByPhone('0000000000')
    expect(customer).toBeNull()
  })

  it('create returns created customer', async () => {
    mockFetch({
      ok: true,
      json: async () => rawCustomer,
    })

    const payload = { ...rawCustomer, id: undefined, createdAt: undefined, updatedAt: undefined }
    // @ts-expect-error: partial payload for test convenience
    const customer = await repository.create(payload)
    expect(fetch).toHaveBeenCalledWith('/api/customer', expect.any(Object))
    expectCustomer(customer)
  })

  it('update returns updated customer', async () => {
    mockFetch({
      ok: true,
      json: async () => ({ ...rawCustomer, name: '更新 太郎' }),
    })

    const customer = await repository.update('cust_1', { name: '更新 太郎' })
    expect(fetch).toHaveBeenCalledWith(
      '/api/customer',
      expect.objectContaining({
        method: 'PUT',
      })
    )
    expect(customer?.name).toBe('更新 太郎')
  })

  it('delete returns true on success', async () => {
    mockFetch({
      ok: true,
    })

    const result = await repository.delete('cust_1')
    expect(fetch).toHaveBeenCalledWith('/api/customer?id=cust_1', {
      method: 'DELETE',
      credentials: 'include',
    })
    expect(result).toBe(true)
  })

  it('delete returns false on failure', async () => {
    mockFetch({
      ok: false,
    })

    const result = await repository.delete('cust_1')
    expect(result).toBe(false)
  })
})
