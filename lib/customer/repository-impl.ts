import { Customer } from './types'
import { CustomerRepository } from './repository'

const API_BASE_URL = '/api/customer'

export class CustomerRepositoryImpl implements CustomerRepository {
  async getAll(): Promise<Customer[]> {
    const response = await fetch(API_BASE_URL)
    if (!response.ok) {
      throw new Error('Failed to fetch customers')
    }
    return response.json()
  }

  async getById(id: string): Promise<Customer | null> {
    const response = await fetch(`${API_BASE_URL}/${id}`)
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error('Failed to fetch customer')
    }
    return response.json()
  }

  async getCustomerByPhone(phone: string): Promise<Customer | null> {
    // This requires a new API endpoint, e.g., /api/customer/by-phone/[phone]
    // For now, we'll return a placeholder.
    console.warn('getCustomerByPhone is not implemented on the API yet.')
    return null
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const response = await fetch(`${API_BASE_URL}/by-email/${encodeURIComponent(email)}`)
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error('Failed to fetch customer by email')
    }
    return response.json()
  }

  async create(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error('Failed to create customer')
    }
    return response.json()
  }

  async update(id: string, data: Partial<Customer>): Promise<Customer | null> {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error('Failed to update customer')
    }
    return response.json()
  }

  async delete(id: string): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
    })
    return response.ok
  }
}
