import { DailyReport } from '@/lib/report/types';
import { DataTable, TableColumn, currencyCell, textCell } from '@/components/shared/data-table';
import { formatCurrency } from '@/lib/shared';

interface DailyReportTableProps {
  report: DailyReport;
}

const columns: TableColumn[] = [
  { key: 'staffName', header: 'スタッフ名', cell: (item) => textCell(item.staffName) },
  { key: 'workingHours', header: '労働時間', cell: (item) => `${item.workingHours}時間` },
  { key: 'salesAmount', header: '売上', cell: (item) => currencyCell(item.salesAmount) },
  { key: 'customerCount', header: '客数', cell: (item) => item.customerCount },
  { key: 'designationCount', header: '指名数', cell: (item) => item.designationCount },
  { key: 'optionSales', header: 'オプション売上', cell: (item) => currencyCell(item.optionSales) },
];

export function DailyReportTable({ report }: DailyReportTableProps) {
  const summary = (
    <>
      <p>総売上: ¥{formatCurrency(report.totalSales)}</p>
      <p>総客数: {report.totalCustomers}</p>
      <p>総労働時間: {report.totalWorkingHours}時間</p>
    </>
  );

  return (
    <DataTable
      title={`日報: ${report.date}`}
      summary={summary}
      data={report.staffReports}
      columns={columns}
    />
  );
}
