'use client'

/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md K-1, K-2
 * @related_to   GET /api/customer: bounded customer list endpoint
 * @known_issues None
 */
import { type FormEvent, useEffect, useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Customer } from '@/lib/customer/types'
import { TableSkeleton } from '@/components/ui/page-loading'
import { PageHeader } from '@/components/admin/page-header'
import { useSession } from 'next-auth/react'
import { hasPermission } from '@/lib/auth/permissions'
import { formatPhoneNumber } from '@/lib/customer/utils'
import { useStore } from '@/contexts/store-context'
import { buildStoreScopedEndpoint } from '@/lib/store/endpoints'

const PAGE_SIZE = 25

const accountStatusLabels: Record<Customer['accountStatus'], string> = {
  pending: '仮会員',
  active: '利用可',
  withdrawn: '退会',
  blocked: 'ブラック',
  unknown: '要確認',
}

const membershipStageLabels: Record<Customer['membershipStage'], string> = {
  regular: 'レギュラー',
  silver: 'シルバー',
  gold: 'ゴールド',
  platinum: 'プラチナ',
  god: 'ゴッド',
  unknown: '要確認',
}

export default function CustomerListPage() {
  const { data: session, status } = useSession()
  const { currentStore } = useStore()
  const grantedPermissions = session?.user?.permissions ?? []
  const canReadCustomers = hasPermission(grantedPermissions, 'customer:read')
  const canCreateCustomers = hasPermission(grantedPermissions, 'customer:create')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [reloadAttempt, setReloadAttempt] = useState(0)

  useEffect(() => {
    if (status !== 'authenticated' || !canReadCustomers) {
      return
    }

    const controller = new AbortController()
    let active = true
    setCustomers([])
    setHasMore(false)
    setLoading(true)
    setErrorMessage(null)

    const fetchCustomers = async () => {
      try {
        const offset = page * PAGE_SIZE
        const queryParameter = query ? `&query=${encodeURIComponent(query)}` : ''
        const response = await fetch(
          buildStoreScopedEndpoint(
            `/api/customer?limit=${PAGE_SIZE}&offset=${offset}${queryParameter}`,
            currentStore.id
          ),
          {
            credentials: 'include',
            cache: 'no-store',
            signal: controller.signal,
          }
        )

        if (!response.ok) {
          throw new Error(`Failed to fetch customers: ${response.status}`)
        }

        const data = await response.json()
        if (!active) {
          return
        }
        setCustomers(data.items ?? [])
        setHasMore(Boolean(data.hasMore))
      } catch (error) {
        if (!active) {
          return
        }
        console.error('Failed to load customers:', error)
        setErrorMessage('顧客一覧を取得できませんでした。通信状態を確認して再試行してください。')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void fetchCustomers()

    return () => {
      active = false
      controller.abort()
    }
  }, [page, query, reloadAttempt, status, canReadCustomers, currentStore.id])

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPage(0)
    setQuery(searchInput.trim())
  }

  if (status === 'loading') {
    return <div className="p-6 text-sm text-muted-foreground">権限を確認しています...</div>
  }

  if (!canReadCustomers) {
    return (
      <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
        顧客情報の閲覧権限がありません。管理者にお問い合わせください。
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="顧客一覧"
        description="登録されている顧客情報を確認できます。"
        actions={
          canCreateCustomers ? (
            <Link href="/admin/customers/new">
              <Button>新規顧客を追加</Button>
            </Link>
          ) : null
        }
      />

      <form className="mb-4 flex gap-2" onSubmit={handleSearch}>
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="氏名・電話番号・メール・会員番号で検索"
          aria-label="顧客検索"
        />
        <Button type="submit">検索</Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>顧客リスト</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={5} columns={8} label="顧客一覧を読み込んでいます" />
          ) : errorMessage ? (
            <div
              role="alert"
              className="flex min-h-48 flex-col items-center justify-center gap-4 rounded-md border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700"
            >
              <p>{errorMessage}</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setReloadAttempt((attempt) => attempt + 1)}
              >
                再試行
              </Button>
            </div>
          ) : customers.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              {query ? '条件に一致する顧客が見つかりません。' : '顧客が登録されていません。'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名前</TableHead>
                  <TableHead>電話番号</TableHead>
                  <TableHead>メールアドレス</TableHead>
                  <TableHead>会員種別</TableHead>
                  <TableHead>ステージ</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead>登録日</TableHead>
                  <TableHead className="text-right">詳細</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{formatPhoneNumber(customer.phone)}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>
                      <Badge variant={customer.memberType === 'vip' ? 'default' : 'secondary'}>
                        {customer.memberType === 'vip' ? 'VIP' : '通常'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {membershipStageLabels[customer.membershipStage ?? 'regular']}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={customer.accountStatus === 'active' ? 'secondary' : 'destructive'}
                      >
                        {accountStatusLabels[customer.accountStatus ?? 'active']}
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
          disabled={page === 0 || loading || Boolean(errorMessage)}
          onClick={() => setPage(page - 1)}
        >
          前へ
        </Button>
        <span className="text-sm text-muted-foreground">{page + 1}ページ</span>
        <Button
          variant="outline"
          disabled={!hasMore || loading || Boolean(errorMessage)}
          onClick={() => setPage(page + 1)}
        >
          次へ
        </Button>
      </div>
    </>
  )
}
