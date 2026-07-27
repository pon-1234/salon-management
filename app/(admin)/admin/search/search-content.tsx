'use client'

/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md K-2
 * @related_to   GET /api/customer?phone=: bounded administrator customer search
 * @known_issues Search currently accepts phone-number fragments only
 */
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface CustomerSearchResult {
  id: string
  name: string
  phone: string
}

const PAGE_SIZE = 25

export function SearchContent() {
  const searchParams = useSearchParams()
  const query = searchParams.get('query')?.trim() ?? ''
  const [results, setResults] = useState<CustomerSearchResult[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!query) {
      setResults([])
      setHasMore(false)
      return
    }

    const controller = new AbortController()
    const loadResults = async () => {
      setIsLoading(true)
      try {
        const offset = page * PAGE_SIZE
        const response = await fetch(
          `/api/customer?phone=${encodeURIComponent(query)}&limit=${PAGE_SIZE + 1}&offset=${offset}`,
          { credentials: 'include', cache: 'no-store', signal: controller.signal }
        )
        if (!response.ok) {
          throw new Error(`Customer search failed: ${response.status}`)
        }
        const payload = (await response.json()) as CustomerSearchResult[]
        setHasMore(payload.length > PAGE_SIZE)
        setResults(payload.slice(0, PAGE_SIZE))
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setResults([])
        setHasMore(false)
      } finally {
        setIsLoading(false)
      }
    }

    void loadResults()
    return () => controller.abort()
  }, [page, query])

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="mb-4 mt-6 text-2xl font-bold">検索結果: {query}</h1>
      {isLoading ? (
        <p>検索中...</p>
      ) : results.length === 0 ? (
        <p>該当する顧客が見つかりませんでした。</p>
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
                  <Button>詳細を見る</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <div className="mt-4 flex items-center justify-end gap-3">
        <Button
          variant="outline"
          disabled={page === 0 || isLoading}
          onClick={() => setPage(page - 1)}
        >
          前へ
        </Button>
        <span className="text-sm text-muted-foreground">{page + 1}ページ</span>
        <Button
          variant="outline"
          disabled={!hasMore || isLoading}
          onClick={() => setPage(page + 1)}
        >
          次へ
        </Button>
      </div>
    </div>
  )
}
