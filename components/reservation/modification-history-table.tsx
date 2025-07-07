'use client'

import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ModificationHistory, ModificationAlert } from '@/lib/types/modification-history'
import { AlertTriangle, Info } from 'lucide-react'

interface ModificationHistoryTableProps {
  modifications: ModificationHistory[]
  alerts: ModificationAlert[]
}

export function ModificationHistoryTable({ modifications, alerts }: ModificationHistoryTableProps) {
  return (
    <div className="space-y-4">
      {/* アラート表示 */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <Alert key={alert.id} variant={alert.type === 'error' ? 'destructive' : 'default'}>
              {alert.type === 'warning' ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <Info className="h-4 w-4" />
              )}
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* 修正履歴テーブル */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日時</TableHead>
              <TableHead>ユーザー</TableHead>
              <TableHead>変更項目</TableHead>
              <TableHead>変更前</TableHead>
              <TableHead>変更後</TableHead>
              <TableHead>理由</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modifications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  修正履歴はありません
                </TableCell>
              </TableRow>
            ) : (
              modifications.map((modification) => (
                <TableRow key={modification.id}>
                  <TableCell>
                    {format(modification.timestamp, 'yyyy/MM/dd HH:mm', { locale: ja })}
                  </TableCell>
                  <TableCell>{modification.userName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{modification.fieldDisplayName}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {String(modification.oldValue)}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {String(modification.newValue)}
                  </TableCell>
                  <TableCell className="text-sm">{modification.reason}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
