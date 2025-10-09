import { Customer } from './types'
import { CustomerRepository } from './repository'
import { resolveApiUrl } from '@/lib/http/base-url'

const API_BASE_URL = '/api/customer'

export class CustomerRepositoryImpl implements CustomerRepository {
  async getAll(): Promise<Customer[]> {
    const response = await fetch(resolveApiUrl(API_BASE_URL), {
      credentials: 'include',
    })
    if (!response.ok) {
      throw new Error('Failed to fetch customers')
    }
    return response.json()
  }

  async getById(id: string): Promise<Customer | null> {
    const response = await fetch(resolveApiUrl(`${API_BASE_URL}?id=${id}`), {
      credentials: 'include',
    })
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error('Failed to fetch customer')
    }
    return response.json()
  }

  async getCustomerByPhone(phone: string): Promise<Customer | null> {
    const url = `/api/customer/by-phone/${encodeURIComponent(phone)}`
    const response = await fetch(resolveApiUrl(url), {
      credentials: 'include',
    })
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error('Failed to fetch customer by phone')
    }
    return response.json()
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
    return response.json()
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
    return response.json()
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
    return response.json()
  }

  async delete(id: string): Promise<boolean> {
    const response = await fetch(resolveApiUrl(`${API_BASE_URL}?id=${id}`), {
      method: 'DELETE',
      credentials: 'include',
    })
    return response.ok
  }
}
