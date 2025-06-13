'use client'

import * as React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ColumnDef<T> {
  id: string
  header: string | React.ReactNode
  accessor?: keyof T | ((row: T) => any)
  cell?: (value: any, row: T) => React.ReactNode
  footer?: (rows: T[]) => React.ReactNode
  className?: string
  align?: 'left' | 'center' | 'right'
}

interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  showPagination?: boolean
  pageSize?: number
  className?: string
  loading?: boolean
  emptyMessage?: string
  showFooter?: boolean
  onRowClick?: (row: T) => void
  rowClassName?: (row: T) => string
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  showPagination = true,
  pageSize: initialPageSize = 10,
  className,
  loading = false,
  emptyMessage = 'データがありません',
  showFooter = false,
  onRowClick,
  rowClassName,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(initialPageSize)

  const totalPages = Math.ceil(data.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentData = showPagination ? data.slice(startIndex, endIndex) : data

  React.useEffect(() => {
    setCurrentPage(1)
  }, [data])

  const getCellValue = (row: T, column: ColumnDef<T>) => {
    if (column.accessor) {
      if (typeof column.accessor === 'function') {
        return column.accessor(row)
      }
      return row[column.accessor as keyof T]
    }
    return null
  }

  const getAlignment = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center':
        return 'text-center'
      case 'right':
        return 'text-right'
      default:
        return 'text-left'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">読み込み中...</div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">{emptyMessage}</div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  className={cn(
                    getAlignment(column.align),
                    column.className
                  )}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.map((row, rowIndex) => (
              <TableRow
                key={rowIndex}
                className={cn(
                  onRowClick && 'cursor-pointer hover:bg-muted/50',
                  rowClassName?.(row)
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => {
                  const value = getCellValue(row, column)
                  return (
                    <TableCell
                      key={column.id}
                      className={cn(
                        getAlignment(column.align),
                        column.className
                      )}
                    >
                      {column.cell ? column.cell(value, row) : value}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
          {showFooter && (
            <tfoot>
              <TableRow>
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    className={cn(
                      getAlignment(column.align),
                      column.className,
                      'font-semibold'
                    )}
                  >
                    {column.footer?.(data)}
                  </TableCell>
                ))}
              </TableRow>
            </tfoot>
          )}
        </Table>
      </div>

      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            {data.length} 件中 {startIndex + 1} - {Math.min(endIndex, data.length)} 件を表示
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm">
              {currentPage} / {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}