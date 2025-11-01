import { AreaSalesData, TransportationFee } from '../types/area-sales'

export function generateAreaSalesData(_year: number): AreaSalesData[] {
  // Generate mock data for multiple areas
  const baseValue = 20000000 // 2000万円ベース

  const areas: AreaSalesData[] = [
    {
      area: '東京都',
      monthlySales: Array.from({ length: 12 }, () =>
        Math.floor(baseValue * 3 + (Math.random() - 0.5) * baseValue * 0.5)
      ),
      monthlyCustomers: Array.from({ length: 12 }, () => Math.floor(800 + Math.random() * 400)),
      total: 0,
      customerTotal: 0,
    },
    {
      area: '神奈川県',
      monthlySales: Array.from({ length: 12 }, () =>
        Math.floor(baseValue * 1.5 + (Math.random() - 0.5) * baseValue * 0.3)
      ),
      monthlyCustomers: Array.from({ length: 12 }, () => Math.floor(500 + Math.random() * 200)),
      total: 0,
      customerTotal: 0,
    },
    {
      area: '千葉県',
      monthlySales: Array.from({ length: 12 }, () =>
        Math.floor(baseValue * 0.8 + (Math.random() - 0.5) * baseValue * 0.2)
      ),
      monthlyCustomers: Array.from({ length: 12 }, () => Math.floor(300 + Math.random() * 150)),
      total: 0,
      customerTotal: 0,
    },
    {
      area: '埼玉県',
      monthlySales: Array.from({ length: 12 }, () =>
        Math.floor(baseValue * 0.7 + (Math.random() - 0.5) * baseValue * 0.2)
      ),
      monthlyCustomers: Array.from({ length: 12 }, () => Math.floor(250 + Math.random() * 120)),
      total: 0,
      customerTotal: 0,
    },
  ]

  // Calculate totals
  areas.forEach((area) => {
    area.total = area.monthlySales.reduce((sum, sale) => sum + sale, 0)
    area.customerTotal = area.monthlyCustomers?.reduce((sum, count) => sum + count, 0)
  })

  return areas
}
