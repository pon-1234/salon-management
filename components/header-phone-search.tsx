/**
 * @design_doc   CST-02 管理画面上部メニューの顧客電話番号検索
 * @related_to   resolvePhoneSearchIntent, CustomerSelectionDialog lookup
 * @known_issues None
 */
'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useStore } from '@/contexts/store-context'
import { buildStoreScopedEndpoint } from '@/lib/store/endpoints'
import { formatPhoneNumber, normalizePhoneQuery } from '@/lib/customer/utils'
import { resolvePhoneSearchIntent } from '@/lib/customer/phone-search-intent'
import { cn } from '@/lib/utils'

type PhoneCustomer = {
  id: string
  name: string
  phone: string
  memberType?: string
}

export function HeaderPhoneSearch() {
  const router = useRouter()
  const { currentStore } = useStore()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [popupCustomers, setPopupCustomers] = useState<PhoneCustomer[] | null>(null)

  const goToNewCustomer = (phone: string) => {
    const params = new URLSearchParams({
      returnTo: 'detail',
      phone,
      store: currentStore.slug,
    })
    router.push(`/admin/customers/new?${params.toString()}`)
  }

  const openCustomer = (customer: PhoneCustomer) => {
    setPopupCustomers(null)
    router.push(`/admin/customers/${encodeURIComponent(customer.id)}`)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const digits = normalizePhoneQuery(query)
    if (digits.length < 3) {
      setMessage('電話番号を3桁以上入力してください。')
      setStatus('error')
      return
    }

    setStatus('loading')
    setMessage(null)

    try {
      const endpoint =
        digits.length >= 10
          ? `/api/customer?phone=${encodeURIComponent(query)}&limit=10`
          : `/api/customer?query=${encodeURIComponent(query)}&limit=10`
      const response = await fetch(buildStoreScopedEndpoint(endpoint, currentStore.id), {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!response.ok) {
        throw new Error(`Customer search failed: ${response.status}`)
      }
      const payload = (await response.json()) as PhoneCustomer[] | { data?: PhoneCustomer[] }
      const results = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.data)
          ? payload.data
          : []
      const intent = resolvePhoneSearchIntent(query, results)
      if (intent.type === 'invalid') {
        setMessage('電話番号を3桁以上入力してください。')
        setStatus('error')
        return
      }
      if (intent.type === 'register') {
        setStatus('idle')
        goToNewCustomer(intent.phone)
        return
      }
      if (intent.type === 'no-match') {
        setMessage('該当する顧客が見つかりませんでした。')
        setStatus('idle')
        return
      }
      if (intent.type === 'show-customer') {
        setPopupCustomers([intent.customer])
        setStatus('idle')
        return
      }
      setPopupCustomers(intent.customers)
      setStatus('idle')
    } catch (error) {
      console.error('Header phone search failed:', error)
      setStatus('error')
      setMessage('顧客検索に失敗しました。もう一度お試しください。')
    }
  }

  return (
    <>
      <form
        className="hidden min-w-[12rem] max-w-[16rem] flex-1 items-center gap-1 xl:flex"
        onSubmit={handleSubmit}
        aria-label="顧客電話番号検索"
      >
        <div className="relative min-w-0 flex-1">
          <Phone className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <Input
            type="tel"
            inputMode="tel"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setMessage(null)
              setStatus('idle')
            }}
            placeholder="電話番号"
            aria-label="顧客の電話番号"
            className="h-9 pl-7 text-sm"
          />
        </div>
        <Button type="submit" size="sm" variant="secondary" disabled={status === 'loading'}>
          {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : '検索'}
        </Button>
      </form>
      {message ? (
        <span className={cn('hidden text-xs xl:inline', status === 'error' && 'text-red-600')}>
          {message}
        </span>
      ) : null}

      <Dialog
        open={popupCustomers !== null}
        onOpenChange={(open) => !open && setPopupCustomers(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>顧客情報</DialogTitle>
            <DialogDescription>
              電話番号検索の結果です。詳細を開いて確認できます。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {(popupCustomers ?? []).map((customer) => (
              <button
                key={customer.id}
                type="button"
                className="w-full rounded-md border p-3 text-left hover:bg-purple-50"
                onClick={() => openCustomer(customer)}
              >
                <div className="font-semibold">{customer.name}</div>
                <div className="text-sm text-gray-600">{formatPhoneNumber(customer.phone)}</div>
                <div className="text-xs text-gray-500">会員番号: {customer.id}</div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
