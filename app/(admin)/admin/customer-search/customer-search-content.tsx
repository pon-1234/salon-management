'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/header'
import { UserPlus } from 'lucide-react'

// モックデータ
const mockCustomers = [
  { id: '1', name: '山田太郎', phone: '09012345678' },
  { id: '2', name: '佐藤花子', phone: '09087654321' },
  { id: '3', name: '鈴木一郎', phone: '09011112222' },
]

export function CustomerSearchContent() {
  const searchParams = useSearchParams()
  const query = searchParams.get('query')
  const [results, setResults] = useState<typeof mockCustomers>([])
  const router = useRouter()

  useEffect(() => {
    if (query) {
      // 実際のアプリケーションでは、ここでAPIリクエストを行います
      const filteredResults = mockCustomers.filter((customer) => customer.phone.includes(query))
      setResults(filteredResults)
    }
  }, [query])

  const handleAddNewCustomer = () => {
    // 新規顧客追加ページへ遷移し、電話番号を渡す
    if (query) {
      router.push(`/admin/customers/new?phone=${encodeURIComponent(query)}`)
    }
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <Header />
      <h1 className="mb-4 mt-6 text-2xl font-bold">電話番号検索結果: {query}</h1>
      {results.length === 0 ? (
        <div className="space-y-4">
          <p>該当する顧客が見つかりませんでした。</p>
          <Button
            onClick={handleAddNewCustomer}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            新規顧客追加
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((customer) => (
            <Card key={customer.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <h2 className="text-lg font-semibold">{customer.name}</h2>
                  <p className="text-sm text-gray-500">{customer.phone}</p>
                </div>
                <Link href={`/admin/customers/${customer.id}`}>
                  <Button className="bg-emerald-600 text-white hover:bg-emerald-700">
                    詳細を見る
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
