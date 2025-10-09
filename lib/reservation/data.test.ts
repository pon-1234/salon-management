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

global.fetch = vi.fn()

describe('reservation data (API-backed)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('fetches all reservations via API', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockReservations,
    } as Response)

    const result = await getAllReservations()

    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/reservation', {
      credentials: 'include',
      cache: 'no-store',
    })
    expect(result).toHaveLength(2)
    expect(result[0].customerId).toBe('cust_1')
    expect(result[0].startTime).toBeInstanceOf(Date)
  })

  it('falls back to mock data when API fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      text: async () => 'error',
    } as Response)

    const result = await getAllReservations()

    expect(result).toEqual(mockReservations)
  })

  it('fetches reservations by customer', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [mockReservations[0]],
    } as Response)

    const result = await getReservationsByCustomerId('cust_1')

    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/reservation?customerId=cust_1', {
      credentials: 'include',
      cache: 'no-store',
    })
    expect(result).toHaveLength(1)
    expect(result[0].customerId).toBe('cust_1')
  })

  it('fallbacks to mock customer reservations on failure', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network'))

    const result = await getReservationsByCustomerId('cust_1')

    expect(result).toEqual([mockReservations[0]])
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

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ id: 'created', ...payload }),
    } as Response)

    const result = await addReservation(payload as any)

    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/reservation', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    expect(result?.id).toBe('created')
  })

  it('updates reservation via API', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: '1', status: 'completed' }),
    } as Response)

    const result = await updateReservation('1', { status: 'completed' } as any)

    expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/reservation', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: '1', status: 'completed' }),
    })
    expect(result?.status).toBe('completed')
  })

  it('falls back to mock reservation creation on failure', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network'))

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

    expect(result.id).toBe('mock')
  })
})
