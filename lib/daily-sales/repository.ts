import { DailySalesData } from '../types/daily-sales'

export interface DailySalesRepository {
  getDailySales(date: Date): Promise<DailySalesData>
  updateDailySales(date: Date, data: DailySalesData): Promise<void>
}
