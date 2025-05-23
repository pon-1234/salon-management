import { DailyReport } from '@/lib/report/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DailyReportTableProps {
  report: DailyReport;
}

export function DailyReportTable({ report }: DailyReportTableProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">日報: {report.date}</h2>
      <div className="mb-4">
        <p>総売上: ¥{report.totalSales.toLocaleString()}</p>
        <p>総客数: {report.totalCustomers}</p>
        <p>総労働時間: {report.totalWorkingHours}時間</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>スタッフ名</TableHead>
            <TableHead>労働時間</TableHead>
            <TableHead>売上</TableHead>
            <TableHead>客数</TableHead>
            <TableHead>指名数</TableHead>
            <TableHead>オプション売上</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {report.staffReports.map((staffReport) => (
            <TableRow key={staffReport.staffId}>
              <TableCell>{staffReport.staffName}</TableCell>
              <TableCell>{staffReport.workingHours}時間</TableCell>
              <TableCell>¥{staffReport.salesAmount.toLocaleString()}</TableCell>
              <TableCell>{staffReport.customerCount}</TableCell>
              <TableCell>{staffReport.designationCount}</TableCell>
              <TableCell>¥{staffReport.optionSales.toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
