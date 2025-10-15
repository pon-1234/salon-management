import { Customer } from './types'
import { CustomerRepository } from './repository'
import { resolveApiUrl } from '@/lib/http/base-url'
import { deserializeCustomer, normalizePhoneQuery } from './utils'

const API_BASE_URL = '/api/customer'

async function parseJson<T>(response: Response): Promise<T> {
  const payload = await response.json()
  return payload?.data ?? payload
}

export class CustomerRepositoryImpl implements CustomerRepository {
  async getAll(): Promise<Customer[]> {
    const response = await fetch(resolveApiUrl(API_BASE_URL), {
      credentials: 'include',
    })
    if (!response.ok) {
      throw new Error('Failed to fetch customers')
    }
    const payload = await parseJson<any[]>(response)
    return Array.isArray(payload) ? payload.map(deserializeCustomer) : []
  }

  async getById(id: string): Promise<Customer | null> {
    const response = await fetch(resolveApiUrl(`${API_BASE_URL}?id=${id}`), {
      credentials: 'include',
    })
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error('Failed to fetch customer')
    }
    const payload = await parseJson<any>(response)
    return payload ? deserializeCustomer(payload) : null
  }

  async getCustomerByPhone(phone: string): Promise<Customer | null> {
    const exactMatches = await this.searchByPhone(phone)
    const normalizedTarget = normalizePhoneQuery(phone)
    return (
      exactMatches.find((customer) => normalizePhoneQuery(customer.phone) === normalizedTarget) ??
      null
    )
  }

  async searchByPhone(phone: string): Promise<Customer[]> {
    const normalized = normalizePhoneQuery(phone)
    if (!normalized) {
      return []
    }
    const url = `${API_BASE_URL}?phone=${encodeURIComponent(normalized)}`
    const response = await fetch(resolveApiUrl(url), {
      credentials: 'include',
    })
    if (!response.ok) {
      throw new Error('Failed to search customers by phone')
    }
    const payload = await parseJson<any[]>(response)
    return Array.isArray(payload) ? payload.map(deserializeCustomer) : []
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const url = `${API_BASE_URL}/by-email/${encodeURIComponent(email)}`
    const response = await fetch(resolveApiUrl(url), {
      credentials: 'include',
    })
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error('Failed to fetch customer by email')
    }
    const payload = await parseJson<any>(response)
    return payload ? deserializeCustomer(payload) : null
  }

  async create(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
    const response = await fetch(resolveApiUrl(API_BASE_URL), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error('Failed to create customer')
    }
    const payload = await parseJson<any>(response)
    return deserializeCustomer(payload)
  }

  async update(id: string, data: Partial<Customer>): Promise<Customer | null> {
    const response = await fetch(resolveApiUrl(API_BASE_URL), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id, ...data }),
    })
    if (!response.ok) {
      throw new Error('Failed to update customer')
    }
    const payload = await parseJson<any>(response)
    return payload ? deserializeCustomer(payload) : null
  }

  async delete(id: string): Promise<boolean> {
    const response = await fetch(resolveApiUrl(`${API_BASE_URL}?id=${id}`), {
      method: 'DELETE',
      credentials: 'include',
    })
    return response.ok
  }
}
