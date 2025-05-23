import { HourlySalesReport, HourlySalesData, TimeSlotSummary } from '../types/hourly-sales';

export function generateHourlySalesData(year: number, month: number): HourlySalesReport {
  const daysInMonth = new Date(year, month, 0).getDate();
  const data: HourlySalesData[] = [];
  const hourlyTotals = new Array(21).fill(0); // 7時 to 27時 (21 hours)
  let grandTotal = 0;

  // Generate data for each day
  for (let day = 1; day <= 14; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    const hours = new Array(21).fill(0).map(() => Math.floor(Math.random() * 5));
    
    // Calculate daily total
    const total = hours.reduce((sum, count) => sum + count, 0);
    
    // Add to hourly totals
    hours.forEach((count, index) => {
      hourlyTotals[index] += count;
    });
    
    grandTotal += total;
    
    data.push({
      date: day,
      dayOfWeek,
      hours,
      total
    });
  }

  // Calculate time slot summaries
  const morningCount = hourlyTotals.slice(0, 5).reduce((sum, count) => sum + count, 0);
  const dayCount = hourlyTotals.slice(5, 13).reduce((sum, count) => sum + count, 0);
  const nightCount = hourlyTotals.slice(13).reduce((sum, count) => sum + count, 0);

  const timeSlots: TimeSlotSummary[] = [
    {
      range: "15",
      count: morningCount,
      percentage: Math.round((morningCount / grandTotal) * 100)
    },
    {
      range: "104",
      count: dayCount,
      percentage: Math.round((dayCount / grandTotal) * 100)
    },
    {
      range: "41",
      count: nightCount,
      percentage: Math.round((nightCount / grandTotal) * 100)
    },
    {
      range: "0",
      count: 0,
      percentage: 0
    }
  ];

  return {
    year,
    month,
    data,
    hourlyTotals,
    grandTotal,
    timeSlots
  };
}
