'use client'

/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md K-1, K-2
 * @related_to   GET /api/customer: bounded customer list endpoint
 * @known_issues None
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Customer } from '@/lib/customer/types'
import { toast } from '@/hooks/use-toast'
import { TableSkeleton } from '@/components/ui/page-loading'

const PAGE_SIZE = 25

export default function CustomerListPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true)
      try {
        const offset = page * PAGE_SIZE
        const response = await fetch(`/api/customer?limit=${PAGE_SIZE}&offset=${offset}`, {
          credentials: 'include',
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch customers: ${response.status}`)
        }

        const data = await response.json()
        setCustomers(data.items ?? [])
        setHasMore(Boolean(data.hasMore))
      } catch (error) {
        console.error('Failed to load customers:', error)
        toast({
          title: 'エラー',
          description: '顧客一覧の取得に失敗しました',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchCustomers()
  }, [page])

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-6xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">顧客一覧</h1>
            <p className="text-sm text-muted-foreground">登録されている顧客情報を確認できます。</p>
          </div>
          <Link href="/admin/customers/new">
            <Button>新規顧客を追加</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>顧客リスト</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton rows={5} columns={6} label="顧客一覧を読み込んでいます" />
            ) : customers.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                顧客が登録されていません。
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名前</TableHead>
                    <TableHead>電話番号</TableHead>
                    <TableHead>メールアドレス</TableHead>
                    <TableHead>会員種別</TableHead>
                    <TableHead>登録日</TableHead>
                    <TableHead className="text-right">詳細</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.phone}</TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>
                        <Badge variant={customer.memberType === 'vip' ? 'default' : 'secondary'}>
                          {customer.memberType === 'vip' ? 'VIP' : '通常'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {customer.createdAt
                          ? new Date(customer.createdAt).toLocaleDateString('ja-JP')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/admin/customers/${customer.id}`}
                          className="text-sm text-emerald-600 hover:underline"
                        >
                          詳細を見る
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <div className="mt-4 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            disabled={page === 0 || loading}
            onClick={() => setPage(page - 1)}
          >
            前へ
          </Button>
          <span className="text-sm text-muted-foreground">{page + 1}ページ</span>
          <Button
            variant="outline"
            disabled={!hasMore || loading}
            onClick={() => setPage(page + 1)}
          >
            次へ
          </Button>
        </div>
      </main>
    </div>
  )
}
