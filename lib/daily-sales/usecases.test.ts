import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DailySalesUseCases } from './usecases'
import { DailySalesRepository } from './repository'
import type { DailySalesData } from '../types/daily-sales'

describe('DailySalesUseCases', () => {
  let mockRepository: DailySalesRepository
  let useCases: DailySalesUseCases

  beforeEach(() => {
    mockRepository = {
      getDailySales: vi.fn(),
      updateDailySales: vi.fn(),
    }
    useCases = new DailySalesUseCases(mockRepository)
  })

  describe('getDailySales', () => {
    it('should return daily sales data for a specific date', async () => {
      const date = new Date('2024-01-15')
      const mockDailySalesData: DailySalesData = {
        date: '2024-01-15',
        totalStaff: 2,
        totalWorkingHours: 16,
        staffSales: [
          {
            staffId: 'staff-1',
            staffName: 'スタッフA',
            workingHours: {
              start: '10:00',
              end: '18:00',
              total: '8:00',
            },
            cashTransactions: {
              count: 5,
              amount: 100000,
            },
            cardTransactions: {
              count: 7,
              amount: 150000,
            },
            totalTransactions: 250000,
            discounts: {
              regular: 5000,
              hotel: 2000,
            },
            totalAmount: 243000,
            staffFee: 121500,
            staffSales: 121500,
            sales: {
              cash: 100000,
              card: 150000,
              total: 250000,
            },
            currentBalance: 121500,
          },
          {
            staffId: 'staff-2',
            staffName: 'スタッフB',
            workingHours: {
              start: '10:00',
              end: '18:00',
              total: '8:00',
            },
            cashTransactions: {
              count: 6,
              amount: 100000,
            },
            cardTransactions: {
              count: 7,
              amount: 150000,
            },
            totalTransactions: 250000,
            discounts: {
              regular: 4000,
              hotel: 3000,
            },
            totalAmount: 243000,
            staffFee: 121500,
            staffSales: 121500,
            sales: {
              cash: 100000,
              card: 150000,
              total: 250000,
            },
            currentBalance: 121500,
          },
        ],
        totals: {
          cashTransactions: {
            count: 11,
            amount: 200000,
          },
          cardTransactions: {
            count: 14,
            amount: 300000,
          },
          totalTransactions: 500000,
          discounts: {
            regular: 9000,
            hotel: 5000,
          },
          totalAmount: 486000,
          staffFee: 243000,
          staffSales: 243000,
          sales: {
            cash: 200000,
            card: 300000,
            total: 500000,
          },
          currentBalance: 243000,
        },
      }

      vi.mocked(mockRepository.getDailySales).mockResolvedValue(mockDailySalesData)

      const result = await useCases.getDailySales(date)

      expect(mockRepository.getDailySales).toHaveBeenCalledWith(date)
      expect(result).toEqual(mockDailySalesData)
    })

    it('should handle dates with no sales data', async () => {
      const date = new Date('2024-12-25') // Christmas - closed
      const mockEmptyData: DailySalesData = {
        date: '2024-12-25',
        totalStaff: 0,
        totalWorkingHours: 0,
        staffSales: [],
        totals: {
          cashTransactions: {
            count: 0,
            amount: 0,
          },
          cardTransactions: {
            count: 0,
            amount: 0,
          },
          totalTransactions: 0,
          discounts: {
            regular: 0,
            hotel: 0,
          },
          totalAmount: 0,
          staffFee: 0,
          staffSales: 0,
          sales: {
            cash: 0,
            card: 0,
            total: 0,
          },
          currentBalance: 0,
        },
      }

      vi.mocked(mockRepository.getDailySales).mockResolvedValue(mockEmptyData)

      const result = await useCases.getDailySales(date)

      expect(mockRepository.getDailySales).toHaveBeenCalledWith(date)
      expect(result).toEqual(mockEmptyData)
    })

    it('should handle future dates', async () => {
      const futureDate = new Date('2030-01-01')
      const mockFutureData: DailySalesData = {
        date: '2030-01-01',
        totalStaff: 0,
        totalWorkingHours: 0,
        staffSales: [],
        totals: {
          cashTransactions: {
            count: 0,
            amount: 0,
          },
          cardTransactions: {
            count: 0,
            amount: 0,
          },
          totalTransactions: 0,
          discounts: {
            regular: 0,
            hotel: 0,
          },
          totalAmount: 0,
          staffFee: 0,
          staffSales: 0,
          sales: {
            cash: 0,
            card: 0,
            total: 0,
          },
          currentBalance: 0,
        },
      }

      vi.mocked(mockRepository.getDailySales).mockResolvedValue(mockFutureData)

      const result = await useCases.getDailySales(futureDate)

      expect(mockRepository.getDailySales).toHaveBeenCalledWith(futureDate)
      expect(result).toEqual(mockFutureData)
    })
  })

  describe('updateDailySales', () => {
    it('should update daily sales data', async () => {
      const date = new Date('2024-01-15')
      const updatedData: DailySalesData = {
        date: '2024-01-15',
        totalStaff: 2,
        totalWorkingHours: 16,
        staffSales: [
          {
            staffId: 'staff-1',
            staffName: 'スタッフA',
            workingHours: {
              start: '10:00',
              end: '18:00',
              total: '8:00',
            },
            cashTransactions: {
              count: 6,
              amount: 125000,
            },
            cardTransactions: {
              count: 9,
              amount: 175000,
            },
            totalTransactions: 300000,
            discounts: {
              regular: 6000,
              hotel: 2000,
            },
            totalAmount: 292000,
            staffFee: 146000,
            staffSales: 146000,
            sales: {
              cash: 125000,
              card: 175000,
              total: 300000,
            },
            currentBalance: 146000,
          },
          {
            staffId: 'staff-2',
            staffName: 'スタッフB',
            workingHours: {
              start: '10:00',
              end: '18:00',
              total: '8:00',
            },
            cashTransactions: {
              count: 6,
              amount: 125000,
            },
            cardTransactions: {
              count: 9,
              amount: 175000,
            },
            totalTransactions: 300000,
            discounts: {
              regular: 5000,
              hotel: 3000,
            },
            totalAmount: 292000,
            staffFee: 146000,
            staffSales: 146000,
            sales: {
              cash: 125000,
              card: 175000,
              total: 300000,
            },
            currentBalance: 146000,
          },
        ],
        totals: {
          cashTransactions: {
            count: 12,
            amount: 250000,
          },
          cardTransactions: {
            count: 18,
            amount: 350000,
          },
          totalTransactions: 600000,
          discounts: {
            regular: 11000,
            hotel: 5000,
          },
          totalAmount: 584000,
          staffFee: 292000,
          staffSales: 292000,
          sales: {
            cash: 250000,
            card: 350000,
            total: 600000,
          },
          currentBalance: 292000,
        },
      }

      vi.mocked(mockRepository.updateDailySales).mockResolvedValue(undefined)

      await useCases.updateDailySales(date, updatedData)

      expect(mockRepository.updateDailySales).toHaveBeenCalledWith(date, updatedData)
    })

    it('should handle updating empty sales data', async () => {
      const date = new Date('2024-01-01')
      const emptyData: DailySalesData = {
        date: '2024-01-01',
        totalStaff: 0,
        totalWorkingHours: 0,
        staffSales: [],
        totals: {
          cashTransactions: {
            count: 0,
            amount: 0,
          },
          cardTransactions: {
            count: 0,
            amount: 0,
          },
          totalTransactions: 0,
          discounts: {
            regular: 0,
            hotel: 0,
          },
          totalAmount: 0,
          staffFee: 0,
          staffSales: 0,
          sales: {
            cash: 0,
            card: 0,
            total: 0,
          },
          currentBalance: 0,
        },
      }

      vi.mocked(mockRepository.updateDailySales).mockResolvedValue(undefined)

      await useCases.updateDailySales(date, emptyData)

      expect(mockRepository.updateDailySales).toHaveBeenCalledWith(date, emptyData)
    })

    it('should validate that cash + card sales equal total sales', async () => {
      const date = new Date('2024-01-15')
      const data: DailySalesData = {
        date: '2024-01-15',
        totalStaff: 1,
        totalWorkingHours: 8,
        staffSales: [],
        totals: {
          cashTransactions: {
            count: 4,
            amount: 40000,
          },
          cardTransactions: {
            count: 6,
            amount: 60000,
          },
          totalTransactions: 100000,
          discounts: {
            regular: 0,
            hotel: 0,
          },
          totalAmount: 100000,
          staffFee: 50000,
          staffSales: 50000,
          sales: {
            cash: 40000,
            card: 60000,
            total: 100000,
          },
          currentBalance: 50000,
        },
      }

      vi.mocked(mockRepository.updateDailySales).mockResolvedValue(undefined)

      await useCases.updateDailySales(date, data)

      // Verify the sum
      expect(data.totals.sales.cash + data.totals.sales.card).toBe(data.totals.sales.total)
      expect(mockRepository.updateDailySales).toHaveBeenCalledWith(date, data)
    })
  })
})
