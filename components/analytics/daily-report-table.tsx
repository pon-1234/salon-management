import { DailyReport } from '@/lib/report/types'
import { DataTable, TableColumn, currencyCell, textCell } from '@/components/shared/data-table'
import { formatCurrency } from '@/lib/shared'

interface DailyReportTableProps {
  report: DailyReport
}

const columns: TableColumn[] = [
  { key: 'staffName', header: 'スタッフ名', cell: (item) => textCell(item.staffName) },
  { key: 'workingHours', header: '労働時間', cell: (item) => `${item.workingHours}時間` },
  { key: 'salesAmount', header: '売上', cell: (item) => currencyCell(item.salesAmount) },
  { key: 'cashCount', header: '現金本数', cell: (item) => item.cashCount ?? 0 },
  { key: 'cashAmount', header: '現金', cell: (item) => currencyCell(item.cashAmount ?? 0) },
  { key: 'cardCount', header: 'カード本数', cell: (item) => item.cardCount ?? 0 },
  { key: 'cardAmount', header: 'カード', cell: (item) => currencyCell(item.cardAmount ?? 0) },
  {
    key: 'storeRevenue',
    header: '店舗売上',
    cell: (item) => currencyCell(item.storeRevenue ?? 0),
  },
  {
    key: 'staffRevenue',
    header: '手取り',
    cell: (item) => currencyCell(item.staffRevenue ?? 0),
  },
  {
    key: 'discountAmount',
    header: '値引き',
    cell: (item) => currencyCell(item.discountAmount ?? 0),
  },
  {
    key: 'hotelExpense',
    header: 'ホテル',
    cell: (item) => currencyCell(item.hotelExpense ?? 0),
  },
  {
    key: 'welfareExpense',
    header: '厚生費',
    cell: (item) => currencyCell(item.welfareExpense ?? 0),
  },
  { key: 'customerCount', header: '客数', cell: (item) => item.customerCount },
  { key: 'designationCount', header: '指名数', cell: (item) => item.designationCount },
  { key: 'optionSales', header: 'オプション売上', cell: (item) => currencyCell(item.optionSales) },
]

export function DailyReportTable({ report }: DailyReportTableProps) {
  const kpis = [
    { label: '総売上', value: `¥${formatCurrency(report.totalSales)}` },
    { label: '現金', value: `¥${formatCurrency(report.totalCashAmount ?? 0)}` },
    { label: 'カード', value: `¥${formatCurrency(report.totalCardAmount ?? 0)}` },
    { label: '店舗売上', value: `¥${formatCurrency(report.totalStoreRevenue ?? 0)}` },
    { label: '手取り', value: `¥${formatCurrency(report.totalStaffRevenue ?? 0)}` },
    { label: '総客数', value: String(report.totalCustomers) },
    { label: '総労働時間', value: `${report.totalWorkingHours}時間` },
  ]

  const summary = (
    <div
      data-testid="daily-report-kpis"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7"
    >
      {kpis.map((kpi) => (
        <div key={kpi.label} className="rounded-lg border bg-white px-3 py-2">
          <p className="text-xs text-muted-foreground">{kpi.label}</p>
          <p className="text-sm font-semibold tabular-nums">{kpi.value}</p>
        </div>
      ))}
    </div>
  )

  return (
    <div className="overflow-x-auto">
      <DataTable
        title={`日報: ${report.date}`}
        summary={summary}
        data={report.staffReports}
        columns={columns}
      />
    </div>
  )
}
