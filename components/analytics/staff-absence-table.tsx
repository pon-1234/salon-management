'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react'

interface StaffAbsenceTableProps {
  year: number
  month: number
}

interface AbsenceRecord {
  id: string
  date: string
  staffName: string
  type: '計画休暇' | '病欠' | '当日欠勤' | '遅刻' | '早退'
  reason: string
  notified: boolean
  impact: '低' | '中' | '高'
  substitute?: string
}

export function StaffAbsenceTable({ year, month }: StaffAbsenceTableProps) {
  const [data, setData] = useState<AbsenceRecord[]>([])

  useEffect(() => {
    // ダミーデータ（実際にはAPIから取得）
    const dummyData: AbsenceRecord[] = [
      {
        id: '1',
        date: `${year}/${month}/3`,
        staffName: 'みお',
        type: '計画休暇',
        reason: '私用のため',
        notified: true,
        impact: '低',
        substitute: 'しほ',
      },
      {
        id: '2',
        date: `${year}/${month}/5`,
        staffName: 'みるく',
        type: '当日欠勤',
        reason: '体調不良',
        notified: false,
        impact: '高',
      },
      {
        id: '3',
        date: `${year}/${month}/8`,
        staffName: 'しほ',
        type: '病欠',
        reason: 'インフルエンザ',
        notified: true,
        impact: '中',
        substitute: 'みなみ',
      },
      {
        id: '4',
        date: `${year}/${month}/12`,
        staffName: 'ななみ',
        type: '遅刻',
        reason: '電車遅延',
        notified: true,
        impact: '低',
      },
      {
        id: '5',
        date: `${year}/${month}/15`,
        staffName: 'きょうか',
        type: '早退',
        reason: '家族の急病',
        notified: true,
        impact: '中',
        substitute: 'れいな',
      },
      {
        id: '6',
        date: `${year}/${month}/20`,
        staffName: 'みお',
        type: '計画休暇',
        reason: '有給休暇',
        notified: true,
        impact: '低',
        substitute: 'みるく',
      },
      {
        id: '7',
        date: `${year}/${month}/25`,
        staffName: 'しのん',
        type: '当日欠勤',
        reason: '急な体調不良',
        notified: false,
        impact: '高',
      },
    ]
    setData(dummyData)
  }, [year, month])

  const getTypeBadge = (type: string) => {
    switch (type) {
      case '計画休暇':
        return <Badge className="bg-blue-500">計画休暇</Badge>
      case '病欠':
        return <Badge className="bg-orange-500">病欠</Badge>
      case '当日欠勤':
        return <Badge className="bg-red-500">当日欠勤</Badge>
      case '遅刻':
        return <Badge className="bg-yellow-500">遅刻</Badge>
      case '早退':
        return <Badge className="bg-purple-500">早退</Badge>
      default:
        return <Badge variant="secondary">{type}</Badge>
    }
  }

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case '低':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case '中':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case '高':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  // 集計データ
  const summary = {
    total: data.length,
    planned: data.filter((d) => d.type === '計画休暇').length,
    unplanned: data.filter((d) => d.type === '当日欠勤').length,
    sick: data.filter((d) => d.type === '病欠').length,
    late: data.filter((d) => d.type === '遅刻').length,
    early: data.filter((d) => d.type === '早退').length,
    notifiedRate: ((data.filter((d) => d.notified).length / data.length) * 100).toFixed(1),
    substituteRate: ((data.filter((d) => d.substitute).length / data.length) * 100).toFixed(1),
  }

  return (
    <div className="space-y-4">
      {/* 集計カード */}
      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold">{summary.total}</div>
          <div className="text-sm text-gray-600">総欠勤数</div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{summary.unplanned}</div>
          <div className="text-sm text-gray-600">当日欠勤</div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{summary.notifiedRate}%</div>
          <div className="text-sm text-gray-600">事前連絡率</div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{summary.substituteRate}%</div>
          <div className="text-sm text-gray-600">代替確保率</div>
        </div>
      </div>

      {/* 欠勤記録テーブル */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日付</TableHead>
              <TableHead>スタッフ名</TableHead>
              <TableHead>種別</TableHead>
              <TableHead>理由</TableHead>
              <TableHead className="text-center">事前連絡</TableHead>
              <TableHead>代替スタッフ</TableHead>
              <TableHead className="text-center">影響度</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{record.date}</TableCell>
                <TableCell className="font-medium">{record.staffName}</TableCell>
                <TableCell>{getTypeBadge(record.type)}</TableCell>
                <TableCell>{record.reason}</TableCell>
                <TableCell className="text-center">
                  {record.notified ? (
                    <CheckCircle className="mx-auto h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="mx-auto h-4 w-4 text-red-600" />
                  )}
                </TableCell>
                <TableCell>
                  {record.substitute || <span className="text-gray-400">-</span>}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    {getImpactIcon(record.impact)}
                    <span className="text-sm">{record.impact}</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
