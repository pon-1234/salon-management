import { DailySalesData } from '../types/daily-sales'
import { DailySalesRepository } from './repository'

const ENDPOINT = '/api/analytics/daily-sales'

export class DailySalesRepositoryImpl implements DailySalesRepository {
  constructor(private readonly storeId?: string) {}

  async getDailySales(date: Date): Promise<DailySalesData> {
    const params = new URLSearchParams({
      date: date.toISOString(),
    })
    if (this.storeId) {
      params.set('storeId', this.storeId)
    }

    const response = await fetch(`${ENDPOINT}?${params.toString()}`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    })

    if (!response.ok) {
      const message = await response.text()
      throw new Error(message || 'Failed to fetch daily sales data')
    }

    return response.json()
  }

  async updateDailySales(): Promise<void> {
    console.info('Daily sales manual update is not implemented yet.')
  }
}

