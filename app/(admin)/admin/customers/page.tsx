'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Customer } from '@/lib/customer/types'
import { toast } from '@/hooks/use-toast'

export default function CustomerListPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/customer', {
          credentials: 'include',
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch customers: ${response.status}`)
        }

        const data = await response.json()
        setCustomers(Array.isArray(data) ? data : data?.data ?? [])
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
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
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
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                読み込み中...
              </div>
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
      </main>
    </div>
  )
}
