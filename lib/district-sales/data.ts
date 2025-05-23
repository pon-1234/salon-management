import { DistrictSalesReport } from '../types/district-sales';

export function generateDistrictSalesData(year: number, area: string): DistrictSalesReport {
  const districts = [
    {
      district: "池袋（北口・西口）",
      code: "G7",
      monthlySales: [415, 397, 316, 385, 395, 488, 528, 495, 410, 369, 385, 158],
      total: 4741
    },
    {
      district: "池袋（南口・西口一部）",
      code: "G7",
      monthlySales: [10, 3, 4, 6, 5, 10, 8, 6, 5, 1, 5, 1],
      total: 64
    },
    {
      district: "池袋（東口・南口一部）",
      code: "G7",
      monthlySales: [4, 6, 2, 5, 1, 5, 7, 4, 5, 6, 5, 2],
      total: 52
    },
    {
      district: "その他",
      code: "G7",
      monthlySales: [0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
      total: 2
    },
    {
      district: "その他",
      code: "G7",
      monthlySales: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0],
      total: 2
    },
    {
      district: "池袋（東口）",
      code: "G7",
      monthlySales: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
      total: 1
    }
  ];

  // Calculate totals
  const totalMonthlySales = Array(12).fill(0);
  let grandTotal = 0;

  districts.forEach(district => {
    district.monthlySales.forEach((sale, index) => {
      totalMonthlySales[index] += sale;
    });
    grandTotal += district.total;
  });

  return {
    year,
    area,
    districts,
    total: {
      monthlySales: totalMonthlySales,
      total: grandTotal
    }
  };
}
