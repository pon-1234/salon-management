import { AreaSalesReport } from '../types/area-sales';

export function generateAreaSalesData(year: number): AreaSalesReport {
  // Generate mock data for Toshima ward
  const toshimaSales = [429, 406, 322, 396, 401, 504, 544, 505, 420, 376, 398, 160];
  
  const areas = [
    {
      area: "豊島区",
      monthlySales: [...toshimaSales],
      total: toshimaSales.reduce((sum, sale) => sum + sale, 0),
    },
    {
      area: "▲小計",
      monthlySales: [...toshimaSales],
      total: toshimaSales.reduce((sum, sale) => sum + sale, 0),
      isSubtotal: true,
    }
  ];

  return {
    year,
    areas,
    total: {
      monthlySales: [...toshimaSales],
      total: toshimaSales.reduce((sum, sale) => sum + sale, 0),
    }
  };
}
