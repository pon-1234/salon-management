"use client"

import { format } from "date-fns"
import { ja } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ModificationHistory, ModificationAlert } from "@/lib/types/modification-history"
import { AlertTriangle, Clock, User, DollarSign, Calendar, Settings } from "lucide-react"

interface ModificationHistoryTableProps {
  modifications: ModificationHistory[]
  alerts?: ModificationAlert[]
}

export function ModificationHistoryTable({ modifications, alerts = [] }: ModificationHistoryTableProps) {
  const getModificationTypeIcon = (type: string) => {
    switch (type) {
      case 'price':
        return <DollarSign className="w-4 h-4 text-green-600" />
      case 'time':
        return <Clock className="w-4 h-4 text-blue-600" />
      case 'staff':
        return <User className="w-4 h-4 text-purple-600" />
      case 'course':
        return <Calendar className="w-4 h-4 text-orange-600" />
      default:
        return <Settings className="w-4 h-4 text-gray-600" />
    }
  }

  const getModificationTypeBadge = (type: string) => {
    const colorMap = {
      'price': 'bg-green-100 text-green-800',
      'time': 'bg-blue-100 text-blue-800', 
      'staff': 'bg-purple-100 text-purple-800',
      'course': 'bg-orange-100 text-orange-800',
      'options': 'bg-yellow-100 text-yellow-800',
      'status': 'bg-gray-100 text-gray-800',
      'other': 'bg-gray-100 text-gray-800'
    }
    
    const typeNames = {
      'price': '料金',
      'time': '時間',
      'staff': 'スタッフ',
      'course': 'コース',
      'options': 'オプション',
      'status': 'ステータス',
      'other': 'その他'
    }

    return (
      <Badge className={colorMap[type as keyof typeof colorMap] || colorMap.other}>
        {typeNames[type as keyof typeof typeNames] || 'その他'}
      </Badge>
    )
  }

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500 bg-red-50'
      case 'high':
        return 'border-orange-500 bg-orange-50'
      case 'medium':
        return 'border-yellow-500 bg-yellow-50'
      default:
        return 'border-blue-500 bg-blue-50'
    }
  }

  const activeAlerts = alerts.filter(alert => !alert.resolved)

  return (
    <div className="space-y-6">
      {/* アラート表示 */}
      {activeAlerts.length > 0 && (
        <div className="space-y-2">
          {activeAlerts.map((alert) => (
            <Alert key={alert.id} className={getAlertSeverityColor(alert.severity)}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex justify-between items-center">
                  <span>{alert.message}</span>
                  <Badge variant="destructive" className="text-xs">
                    {alert.severity.toUpperCase()}
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* 修正履歴テーブル */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            修正履歴 ({modifications.length}件)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {modifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              修正履歴はありません
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日時</TableHead>
                  <TableHead>修正者</TableHead>
                  <TableHead>種類</TableHead>
                  <TableHead>項目</TableHead>
                  <TableHead>変更前</TableHead>
                  <TableHead>変更後</TableHead>
                  <TableHead>理由</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modifications.map((modification) => (
                  <TableRow key={modification.id}>
                    <TableCell className="font-mono text-sm">
                      {format(modification.modificationDate, 'yyyy-MM-dd HH:mm:ss', { locale: ja })}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{modification.modifiedByName}</div>
                        <div className="text-xs text-gray-500">{modification.modifiedBy}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getModificationTypeIcon(modification.modificationType)}
                        {getModificationTypeBadge(modification.modificationType)}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {modification.fieldChanged}
                    </TableCell>
                    <TableCell className="font-mono text-sm bg-red-50 text-red-700">
                      {modification.oldValue}
                    </TableCell>
                    <TableCell className="font-mono text-sm bg-green-50 text-green-700">
                      {modification.newValue}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={modification.reason}>
                      {modification.reason}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">
                      {modification.ipAddress}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}