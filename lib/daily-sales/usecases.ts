import { DailySalesData } from '../types/daily-sales';
import { DailySalesRepository } from './repository';

export class DailySalesUseCases {
  constructor(private repository: DailySalesRepository) {}

  async getDailySales(date: Date): Promise<DailySalesData> {
    return this.repository.getDailySales(date);
  }

  async updateDailySales(date: Date, data: DailySalesData): Promise<void> {
    return this.repository.updateDailySales(date, data);
  }
}
