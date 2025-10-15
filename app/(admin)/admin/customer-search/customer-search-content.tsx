'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/header'
import { Badge } from '@/components/ui/badge'
import { Loader2, MapPin, Phone, UserPlus, UsersRound } from 'lucide-react'
import { Customer } from '@/lib/customer/types'
import { CustomerRepositoryImpl } from '@/lib/customer/repository-impl'
import { CustomerUseCases } from '@/lib/customer/usecases'
import { normalizePhoneQuery } from '@/lib/customer/utils'
import { isVipMember } from '@/lib/utils'

type SearchStatus = 'idle' | 'loading' | 'error' | 'success'

function CustomerResultCard({ customer }: { customer: Customer }) {
  return (
    <Card key={customer.id} className="border-emerald-100 shadow-sm transition hover:shadow-md">
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold">{customer.name}</p>
            <Badge variant={isVipMember(customer.memberType) ? 'default' : 'secondary'}>
              {isVipMember(customer.memberType) ? 'VIP' : '通常'}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Phone className="h-4 w-4" />
              {customer.phone}
            </span>
            <span className="flex items-center gap-1">
              <UsersRound className="h-4 w-4" />
              {customer.points.toLocaleString()} pt
            </span>
            {customer.lastVisitDate && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                最終利用: {customer.lastVisitDate.toLocaleDateString('ja-JP')}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/admin/customers/${customer.id}`}>
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700">詳細を見る</Button>
          </Link>
          <Link href={`/admin/reservation?customerId=${customer.id}`}>
            <Button variant="outline">予約を作成</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export function CustomerSearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const rawQuery = searchParams.get('query') ?? ''
  const query = rawQuery.trim()

  const customerUseCases = useMemo(
    () => new CustomerUseCases(new CustomerRepositoryImpl()),
    []
  )

  const [status, setStatus] = useState<SearchStatus>('idle')
  const [results, setResults] = useState<Customer[]>([])
  const [error, setError] = useState<string | null>(null)
  const redirectedRef = useRef(false)

  useEffect(() => {
    redirectedRef.current = false
  }, [query])

  useEffect(() => {
    if (!query) {
      setStatus('idle')
      setResults([])
      setError(null)
      return
    }

    const controller = new AbortController()
    const run = async () => {
      try {
        setStatus('loading')
        setError(null)
        const customers = await customerUseCases.searchByPhone(query)
        if (!controller.signal.aborted) {
          setResults(customers)
          setStatus('success')
        }
      } catch (err) {
        if (controller.signal.aborted) return
        console.error(err)
        setError('顧客情報の取得に失敗しました')
        setStatus('error')
      }
    }

    run()
    return () => controller.abort()
  }, [customerUseCases, query])

  useEffect(() => {
    if (status !== 'success' || redirectedRef.current) return
    if (results.length !== 1) return
    const target = results[0]
    redirectedRef.current = true
    router.replace(`/admin/customers/${target.id}`)
  }, [results, router, status])

  const handleAddNewCustomer = () => {
    if (!query) return
    const digits = normalizePhoneQuery(query)
    router.push(`/admin/customers/new?phone=${encodeURIComponent(digits || query)}`)
  }

  const renderContent = () => {
    if (!query) {
      return <p className="text-gray-600">電話番号を入力して顧客を検索してください。</p>
    }

    if (status === 'loading') {
      return (
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          検索中です…
        </div>
      )
    }

    if (status === 'error') {
      return (
        <div className="space-y-4">
          <p className="text-red-600">{error}</p>
          <Button onClick={handleAddNewCustomer} className="bg-emerald-600 text-white hover:bg-emerald-700">
            <UserPlus className="mr-2 h-4 w-4" />
            新規顧客を登録
          </Button>
        </div>
      )
    }

    if (status === 'success' && results.length === 0) {
      return (
        <div className="space-y-4">
          <p className="text-gray-700">該当する顧客が見つかりませんでした。</p>
          <Button onClick={handleAddNewCustomer} className="bg-emerald-600 text-white hover:bg-emerald-700">
            <UserPlus className="mr-2 h-4 w-4" />
            新規顧客を登録
          </Button>
        </div>
      )
    }

    if (status === 'success') {
      return (
        <div className="space-y-4">
          {results.map((customer) => (
            <CustomerResultCard key={customer.id} customer={customer} />
          ))}
        </div>
      )
    }

    return null
  }

  return (
    <div className="bg-gray-50">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">電話番号検索</h1>
          <p className="mt-1 text-sm text-gray-600">
            入力された電話番号に一致する顧客を表示します。完全一致の場合は自動で顧客詳細へ遷移します。
          </p>
          {query && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1 shadow">
              <span className="text-sm text-gray-500">検索キーワード</span>
              <span className="font-semibold text-gray-900">{query}</span>
            </div>
          )}
        </div>
        {renderContent()}
      </main>
    </div>
  )
}
