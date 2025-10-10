import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAllReservations, getReservationsByCustomerId, addReservation, updateReservation } from './data'

vi.mock('@/lib/http/base-url', () => ({
  resolveApiUrl: (path: string) => `http://localhost:3000${path}`,
}))

const mockReservations = [
  {
    id: '1',
    customerId: 'cust_1',
    staffId: 'staff_1',
    serviceId: 'service_1',
    startTime: '2024-01-01T10:00:00Z',
    endTime: '2024-01-01T11:00:00Z',
    status: 'confirmed',
    price: 12000,
  },
  {
    id: '2',
    customerId: 'cust_2',
    staffId: 'staff_2',
    serviceId: 'service_2',
    startTime: '2024-01-02T10:00:00Z',
    endTime: '2024-01-02T11:30:00Z',
    status: 'pending',
    price: 15000,
  },
]

vi.mock('./mock-data', () => ({
  getAllMockReservations: vi.fn(async () => mockReservations),
  getMockReservationsByCustomerId: vi.fn(async (customerId: string) =>
    mockReservations.filter((r) => r.customerId === customerId)
  ),
  addMockReservation: vi.fn((reservation) => ({ id: 'mock', ...reservation })),
  updateMockReservation: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  default: {
    warn: vi.fn(),
  },
}))

function jsonResponse(data: any, init?: Partial<Response>): Response {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    statusText: init?.statusText ?? 'OK',
    json: async () => data,
    text: async () => (typeof data === 'string' ? data : JSON.stringify(data)),
  } as Response
}

global.fetch = vi.fn()

describe('reservation data (API-backed)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('fetches all reservations via API', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = input.toString()
      if (url.includes('/api/reservation')) {
        return jsonResponse(mockReservations)
      }
      if (url.includes('cust_1')) {
        return jsonResponse({ id: 'cust_1', name: '山田太郎' })
      }
      if (url.includes('cust_2')) {
        return jsonResponse({ id: 'cust_2', name: '佐藤花子' })
      }
      return jsonResponse({}, { ok: false, status: 404, statusText: 'Not Found' })
    })

    const result = await getAllReservations()

    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/reservation', {
      credentials: 'include',
      cache: 'no-store',
    })
    expect(result).toHaveLength(2)
    expect(result[0].customerName).toBe('山田太郎')
    expect(result[0].startTime).toBeInstanceOf(Date)
  })

  it('falls back to mock data when API fails', async () => {
    let call = 0
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = input.toString()
      if (call === 0 && url.includes('/api/reservation')) {
        call += 1
        return jsonResponse('error', {
          ok: false,
          status: 500,
          statusText: 'Server Error',
        })
      }
      if (url.includes('cust_1')) {
        return jsonResponse({ id: 'cust_1', name: '山田太郎' })
      }
      if (url.includes('cust_2')) {
        return jsonResponse({ id: 'cust_2', name: '佐藤花子' })
      }
      return jsonResponse({}, { ok: false, status: 404, statusText: 'Not Found' })
    })

    const result = await getAllReservations()

    expect(result).toHaveLength(2)
    expect(result[0].customerName).toBe('山田太郎')
  })

  it('fetches reservations by customer', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = input.toString()
      if (url.includes('/api/reservation')) {
        return jsonResponse([mockReservations[0]])
      }
      if (url.includes('cust_1')) {
        return jsonResponse({ id: 'cust_1', name: '山田太郎' })
      }
      return jsonResponse({}, { ok: false, status: 404 })
    })

    const result = await getReservationsByCustomerId('cust_1')

    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/reservation?customerId=cust_1', {
      credentials: 'include',
      cache: 'no-store',
    })
    expect(result[0].customerName).toBe('山田太郎')
  })

  it('fallbacks to mock customer reservations on failure', async () => {
    let call = 0
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      if (call === 0) {
        call += 1
        throw new Error('network')
      }
      const url = input.toString()
      if (url.includes('cust_1')) {
        return jsonResponse({ id: 'cust_1', name: '山田太郎' })
      }
      return jsonResponse({}, { ok: false, status: 404 })
    })

    const result = await getReservationsByCustomerId('cust_1')

    expect(result).toHaveLength(1)
    expect(result[0].customerName).toBe('山田太郎')
  })

  it('creates reservation via API', async () => {
    const payload = {
      customerId: 'cust_3',
      staffId: 'staff_1',
      serviceId: 'service',
      startTime: new Date(),
      endTime: new Date(),
      status: 'confirmed',
      price: 1000,
    }

    const fetchMock = vi.mocked(fetch)
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = input.toString()
      if (url.includes('/api/reservation') && !url.includes('?id=')) {
        return jsonResponse({ id: 'created', ...payload }, { status: 201 })
      }
      if (url.includes('cust_3')) {
        return jsonResponse({ id: 'cust_3', name: '新規顧客' })
      }
      return jsonResponse({}, { ok: false, status: 404 })
    })

    const result = await addReservation(payload as any)

    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/reservation', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    expect(result?.customerName).toBe('新規顧客')
  })

  it('updates reservation via API', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = input.toString()
      if (url.includes('/api/reservation') && !url.includes('?id=')) {
        return jsonResponse({ id: '1', status: 'completed', customerId: 'cust_1' })
      }
      if (url.includes('cust_1')) {
        return jsonResponse({ id: 'cust_1', name: '山田太郎' })
      }
      return jsonResponse({}, { ok: false, status: 404 })
    })

    const result = await updateReservation('1', { status: 'completed' } as any)

    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/reservation', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: '1', status: 'completed' }),
    })
    expect(result?.customerName).toBe('山田太郎')
  })

  it('falls back to mock reservation creation on failure', async () => {
    let call = 0
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      if (call === 0) {
        call += 1
        throw new Error('network')
      }
      const url = input.toString()
      if (url.includes('cust_4')) {
        return jsonResponse({ id: 'cust_4', name: '新規顧客' })
      }
      return jsonResponse({}, { ok: false, status: 404 })
    })

    const payload = {
      customerId: 'cust_4',
      staffId: 'staff_2',
      serviceId: 'svc',
      startTime: new Date(),
      endTime: new Date(),
      status: 'pending',
      price: 2000,
    }

    const result = await addReservation(payload as any)

    expect(result.customerName).toBe('新規顧客')
  })
})
