import { DistrictSalesReport } from '../types/district-sales'

export function generateDistrictSalesData(year: number, area: string): DistrictSalesReport {
  const districts = Array.from({ length: 8 }, (_, index) => {
    const districtName =
      area === '東京都'
        ? ['千代田区', '中央区', '港区', '新宿区', '渋谷区', '品川区', '目黒区', '世田谷区'][index]
        : ['横浜市', '川崎市', '相模原市', '藤沢市', '鎌倉市', '茅ヶ崎市', '平塚市', '小田原市'][index]

    const monthlySales = Array.from({ length: 12 }, () =>
      Math.floor(8_000_000 + Math.random() * 6_000_000)
    )
    const monthlyCustomers = Array.from({ length: 12 }, () =>
      Math.floor(300 + Math.random() * 200)
    )
    const monthlyNewCustomers = monthlyCustomers.map((count) =>
      Math.floor(count * (0.2 + Math.random() * 0.15))
    )

    const total = monthlySales.reduce((sum, value) => sum + value, 0)
    const customerTotal = monthlyCustomers.reduce((sum, value) => sum + value, 0)
    const newCustomerTotal = monthlyNewCustomers.reduce((sum, value) => sum + value, 0)

    return {
      district: districtName,
      code: area,
      monthlySales,
      total,
      monthlyCustomers,
      customerTotal,
      monthlyNewCustomers,
      newCustomerTotal,
    }
  })

  const totalMonthlySales = Array(12).fill(0)
  const totalMonthlyCustomers = Array(12).fill(0)
  const totalMonthlyNewCustomers = Array(12).fill(0)

  districts.forEach((district) => {
    district.monthlySales.forEach((sale, index) => {
      totalMonthlySales[index] += sale
    })
    district.monthlyCustomers?.forEach((count, index) => {
      totalMonthlyCustomers[index] += count
    })
    district.monthlyNewCustomers?.forEach((count, index) => {
      totalMonthlyNewCustomers[index] += count
    })
  })

  const grandTotal = totalMonthlySales.reduce((sum, value) => sum + value, 0)
  const grandCustomers = totalMonthlyCustomers.reduce((sum, value) => sum + value, 0)
  const grandNewCustomers = totalMonthlyNewCustomers.reduce((sum, value) => sum + value, 0)

  return {
    year,
    area,
    districts: districts.sort((a, b) => b.total - a.total),
    total: {
      monthlySales: totalMonthlySales,
      total: grandTotal,
      monthlyCustomers: totalMonthlyCustomers,
      customerTotal: grandCustomers,
      monthlyNewCustomers: totalMonthlyNewCustomers,
      newCustomerTotal: grandNewCustomers,
    },
  }
}
