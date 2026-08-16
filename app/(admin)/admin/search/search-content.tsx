'use client'

/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md K-2
 * @related_to   GET /api/customer?query=: bounded administrator customer search
 * @known_issues None
 */
import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatPhoneNumber } from '@/lib/customer/utils'
import { useStore } from '@/contexts/store-context'
import { buildStoreScopedEndpoint } from '@/lib/store/endpoints'

interface CustomerSearchResult {
  id: string
  name: string
  phone: string
}

const PAGE_SIZE = 25

export function SearchContent() {
  const { currentStore } = useStore()
  const searchParams = useSearchParams()
  const query = searchParams.get('query')?.trim() ?? ''
  const [results, setResults] = useState<CustomerSearchResult[]>([])
  const [pagination, setPagination] = useState({ query: '', page: 0 })
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [retryAttempt, setRetryAttempt] = useState(0)
  const requestIdRef = useRef(0)
  const page = pagination.query === query ? pagination.page : 0

  useEffect(() => {
    const requestId = ++requestIdRef.current
    if (!query) {
      setResults([])
      setHasMore(false)
      setErrorMessage(null)
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    const loadResults = async () => {
      setIsLoading(true)
      setErrorMessage(null)
      try {
        const offset = page * PAGE_SIZE
        const response = await fetch(
          buildStoreScopedEndpoint(
            `/api/customer?query=${encodeURIComponent(query)}&limit=${PAGE_SIZE}&offset=${offset}`,
            currentStore.id
          ),
          { credentials: 'include', cache: 'no-store', signal: controller.signal }
        )
        if (!response.ok) {
          throw new Error(`Customer search failed: ${response.status}`)
        }
        const payload = (await response.json()) as {
          items?: CustomerSearchResult[]
          hasMore?: boolean
        }
        if (controller.signal.aborted || requestId !== requestIdRef.current) return
        setHasMore(Boolean(payload.hasMore))
        setResults(Array.isArray(payload.items) ? payload.items : [])
      } catch (error) {
        if (
          controller.signal.aborted ||
          requestId !== requestIdRef.current ||
          (error instanceof DOMException && error.name === 'AbortError')
        ) {
          return
        }
        setResults([])
        setHasMore(false)
        setErrorMessage('顧客検索に失敗しました。時間を置いて再試行してください。')
      } finally {
        if (!controller.signal.aborted && requestId === requestIdRef.current) {
          setIsLoading(false)
        }
      }
    }

    void loadResults()
    return () => controller.abort()
  }, [currentStore.id, page, query, retryAttempt])

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="mb-4 mt-6 text-2xl font-bold">検索結果: {query}</h1>
      {isLoading ? (
        <p>検索中...</p>
      ) : errorMessage ? (
        <div role="alert" className="space-y-3 rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{errorMessage}</p>
          <Button variant="outline" onClick={() => setRetryAttempt((attempt) => attempt + 1)}>
            再試行
          </Button>
        </div>
      ) : results.length === 0 ? (
        <p>該当する顧客が見つかりませんでした。</p>
      ) : (
        <div className="space-y-4">
          {results.map((customer) => (
            <Card key={customer.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <h2 className="text-lg font-semibold">{customer.name}</h2>
                  <p className="text-sm text-gray-500">{formatPhoneNumber(customer.phone)}</p>
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
          onClick={() => setPagination({ query, page: Math.max(0, page - 1) })}
        >
          前へ
        </Button>
        <span className="text-sm text-muted-foreground">{page + 1}ページ</span>
        <Button
          variant="outline"
          disabled={!hasMore || isLoading}
          onClick={() => setPagination({ query, page: page + 1 })}
        >
          次へ
        </Button>
      </div>
    </div>
  )
}
