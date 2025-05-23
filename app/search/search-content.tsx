"use client"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"

// モックデータ
const mockCustomers = [
  { id: '1', name: '山田太郎', phone: '09012345678' },
  { id: '2', name: '佐藤花子', phone: '09087654321' },
  { id: '3', name: '鈴木一郎', phone: '09011112222' },
]

export function SearchContent() {
  const searchParams = useSearchParams()
  const query = searchParams.get('query')
  const [results, setResults] = useState<typeof mockCustomers>([])

  useEffect(() => {
    // 実際のアプリケーションでは、ここでAPIリクエストを行います
    const filteredResults = mockCustomers.filter(
      customer => customer.phone.includes(query || '')
    )
    setResults(filteredResults)
  }, [query])

  return (
    <div className="container mx-auto py-6 px-4">
      <Header />
      <h1 className="text-2xl font-bold mb-4 mt-6">検索結果: {query}</h1>
      {results.length === 0 ? (
        <p>該当する顧客が見つかりませんでした。</p>
      ) : (
        <div className="space-y-4">
          {results.map(customer => (
            <Card key={customer.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <h2 className="text-lg font-semibold">{customer.name}</h2>
                  <p className="text-sm text-gray-500">{customer.phone}</p>
                </div>
                <Link href={`/customers/${customer.id}`}>
                  <Button>詳細を見る</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 