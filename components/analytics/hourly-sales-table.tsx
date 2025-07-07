import { HourlySalesReport } from '@/lib/types/hourly-sales'
import { cn } from '@/lib/utils'

interface HourlySalesTableProps {
  data: HourlySalesReport
}

export function HourlySalesTable({ data }: HourlySalesTableProps) {
  const hours = Array.from({ length: 21 }, (_, i) => i + 7)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="p-2 text-left font-medium">日時</th>
            {hours.map((hour) => (
              <th key={hour} className="whitespace-nowrap p-2 text-center font-medium">
                {hour}時
              </th>
            ))}
            <th className="p-2 text-center font-medium">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {data.data.map((day) => (
            <tr
              key={day.date}
              className={cn(
                'border-b hover:bg-gray-50',
                day.dayOfWeek === '日' && 'bg-orange-50 hover:bg-orange-100',
                day.dayOfWeek === '土' && 'bg-blue-50 hover:bg-blue-100'
              )}
            >
              <td className="whitespace-nowrap p-2">
                {day.date.toString().padStart(2, '0')}({day.dayOfWeek})
              </td>
              {day.hours.map((count, index) => (
                <td key={index} className="p-2 text-center">
                  {count || '0'}
                </td>
              ))}
              <td className="p-2 text-center font-medium text-blue-600">{day.total}</td>
            </tr>
          ))}
          <tr className="border-b font-medium">
            <td className="p-2">TOTAL</td>
            {data.hourlyTotals.map((total, index) => (
              <td key={index} className="p-2 text-center text-blue-600">
                {total}
              </td>
            ))}
            <td className="p-2 text-center text-blue-600">{data.grandTotal}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={22} className="p-2">
              <div className="flex gap-8">
                <div className="whitespace-nowrap">時間帯</div>
                {data.timeSlots.map((slot, index) => (
                  <div key={index} className="whitespace-nowrap">
                    {slot.range}({slot.percentage}%)
                  </div>
                ))}
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
