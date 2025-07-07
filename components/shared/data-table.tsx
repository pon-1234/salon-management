import { ReactNode } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/shared'

export interface TableColumn<T = any> {
  key: string
  header: string
  cell: (item: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  title?: string
  summary?: ReactNode
  data: T[]
  columns: TableColumn<T>[]
  className?: string
}

export function DataTable<T>({ title, summary, data, columns, className }: DataTableProps<T>) {
  return (
    <div className={className}>
      {title && <h2 className="mb-2 text-xl font-semibold">{title}</h2>}
      {summary && <div className="mb-4">{summary}</div>}
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index) => (
            <TableRow key={index}>
              {columns.map((column) => (
                <TableCell key={column.key} className={column.className}>
                  {column.cell(item)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export const currencyCell = (value: number) => `¥${formatCurrency(value)}`
export const numberCell = (value: number) => value.toLocaleString()
export const textCell = (value: string) => value
