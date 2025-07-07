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
      total: 0,
    },
    {
      area: '神奈川県',
      monthlySales: Array.from({ length: 12 }, () =>
        Math.floor(baseValue * 1.5 + (Math.random() - 0.5) * baseValue * 0.3)
      ),
      total: 0,
    },
    {
      area: '千葉県',
      monthlySales: Array.from({ length: 12 }, () =>
        Math.floor(baseValue * 0.8 + (Math.random() - 0.5) * baseValue * 0.2)
      ),
      total: 0,
    },
    {
      area: '埼玉県',
      monthlySales: Array.from({ length: 12 }, () =>
        Math.floor(baseValue * 0.7 + (Math.random() - 0.5) * baseValue * 0.2)
      ),
      total: 0,
    },
  ]

  // Calculate totals
  areas.forEach((area) => {
    area.total = area.monthlySales.reduce((sum, sale) => sum + sale, 0)
  })

  return areas
}

export function getTransportationFees(): TransportationFee[] {
  return [
    {
      area: '池袋北口・西口周辺',
      fee: 0,
    },
    {
      area: '池袋南口・西口一部周辺',
      fee: 1000,
    },
    {
      area: '池袋東口周辺',
      fee: 2000,
    },
    {
      area: 'その他',
      fee: 3000,
    },
  ]
}
