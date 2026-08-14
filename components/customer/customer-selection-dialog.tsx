/**
 * @design_doc   docs/LEGACY_GOLD_ADMIN_MIGRATION_INVENTORY.md customer lookup
 * @related_to   CustomerRepositoryImpl server-side identity search
 * @known_issues None
 */
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Search,
  User,
  Phone,
  Mail,
  Crown,
  Star,
  ChevronRight,
  UserPlus,
  Clock,
  Loader2,
  RotateCcw,
} from 'lucide-react'
import { Customer } from '@/lib/customer/types'
import { useRouter } from 'next/navigation'
import { cn, isVipMember } from '@/lib/utils'
import { CustomerUseCases } from '@/lib/customer/usecases'
import { CustomerRepositoryImpl } from '@/lib/customer/repository-impl'
import { normalizePhoneQuery } from '@/lib/customer/utils'
import { useStore } from '@/contexts/store-context'

interface CustomerSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectCustomer?: (customer: Customer) => void
  mode?: 'reservation' | 'lookup'
}

type SearchStatus = 'idle' | 'loading' | 'ready' | 'error'

export function CustomerSelectionDialog({
  open,
  onOpenChange,
  onSelectCustomer,
  mode = 'reservation',
}: CustomerSelectionDialogProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [allCustomers, setAllCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [status, setStatus] = useState<SearchStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const router = useRouter()
  const { currentStore } = useStore()
  const hasLoadedRef = useRef(false)
  const wasOpenRef = useRef(false)

  const customerUseCases = useMemo(() => new CustomerUseCases(new CustomerRepositoryImpl()), [])

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setSearchTerm('')
      setSelectedCustomer(null)
      setErrorMessage(null)
      setFilteredCustomers(hasLoadedRef.current ? allCustomers : [])
      setStatus(hasLoadedRef.current ? 'ready' : 'loading')
    }
    wasOpenRef.current = open
  }, [allCustomers, open])

  useEffect(() => {
    if (!open || hasLoadedRef.current) {
      return
    }

    let ignore = false

    const fetchCustomers = async () => {
      setStatus('loading')
      setErrorMessage(null)
      try {
        const customers = await customerUseCases.getAll()
        if (!ignore) {
          setAllCustomers(customers)
          setFilteredCustomers(customers)
          hasLoadedRef.current = true
          setStatus('ready')
        }
      } catch (error) {
        console.error('Failed to fetch customers:', error)
        if (!ignore) {
          setAllCustomers([])
          setFilteredCustomers([])
          setStatus('error')
          setErrorMessage(
            '顧客データを取得できませんでした。通信状態を確認して再試行してください。'
          )
        }
      }
    }

    fetchCustomers()

    return () => {
      ignore = true
    }
  }, [open, customerUseCases, loadAttempt])

  const filterLocally = (source: Customer[], term: string) => {
    if (!term) {
      return source
    }
    const lower = term.toLowerCase()
    return source.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(lower) ||
        customer.phone.includes(term) ||
        customer.email.toLowerCase().includes(lower) ||
        customer.id.includes(term)
      )
    })
  }

  useEffect(() => {
    if (!open) {
      return
    }

    if (!hasLoadedRef.current) {
      return
    }

    const trimmed = searchTerm.trim()
    const normalizedPhone = normalizePhoneQuery(trimmed)
    const shouldSearchByPhone =
      normalizedPhone.length >= 3 && /^\d[\d\s-]*$/.test(trimmed.replace(/\s/g, ''))

    if (!trimmed) {
      setFilteredCustomers(allCustomers)
      setStatus('ready')
      return
    }

    let ignore = false
    setStatus('loading')
    setErrorMessage(null)

    const searchRequest = shouldSearchByPhone
      ? customerUseCases.searchByPhone(trimmed)
      : customerUseCases.search(trimmed)

    searchRequest
      .then((customers) => {
        if (ignore) return
        setFilteredCustomers(customers)
        setStatus('ready')
      })
      .catch((error) => {
        console.error('Customer search failed:', error)
        if (ignore) return
        setFilteredCustomers(filterLocally(allCustomers, trimmed))
        setStatus('ready')
        setErrorMessage('顧客検索に失敗しました。読み込み済みの範囲のみ表示しています。')
      })

    return () => {
      ignore = true
    }
  }, [searchTerm, open, allCustomers, customerUseCases])

  useEffect(() => {
    if (searchTerm.trim() && filteredCustomers.length === 1) {
      setSelectedCustomer(filteredCustomers[0])
      return
    }

    if (
      selectedCustomer &&
      !filteredCustomers.some((customer) => customer.id === selectedCustomer.id)
    ) {
      setSelectedCustomer(null)
    }
  }, [filteredCustomers, searchTerm, selectedCustomer])

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer)
  }

  const handleProceed = () => {
    if (selectedCustomer) {
      if (onSelectCustomer) {
        onSelectCustomer(selectedCustomer)
        onOpenChange(false)
      } else {
        if (mode === 'lookup') {
          router.push(`/admin/customers/${encodeURIComponent(selectedCustomer.id)}`)
        } else {
          router.push(`/admin/reservation?customerId=${encodeURIComponent(selectedCustomer.id)}`)
        }
        onOpenChange(false)
      }
    }
  }

  const handleNewCustomer = () => {
    const params = new URLSearchParams({
      returnTo: mode === 'reservation' ? 'reservation' : 'detail',
    })
    const normalizedPhone = normalizePhoneQuery(searchTerm)
    if (normalizedPhone.length >= 3) {
      params.set('phone', normalizedPhone)
    }
    params.set('store', currentStore.slug)
    router.push(`/admin/customers/new?${params.toString()}`)
    onOpenChange(false)
  }

  const handleRetry = () => {
    hasLoadedRef.current = false
    setErrorMessage(null)
    setStatus('loading')
    setLoadAttempt((attempt) => attempt + 1)
  }

  const handleOpenTimeline = () => {
    router.push('/admin/reservation')
    onOpenChange(false)
  }

  const showLoadingState = status === 'loading' || (open && !hasLoadedRef.current)
  const isLookupMode = mode === 'lookup'

  const getMemberBadge = (type: string) => {
    if (isVipMember(type)) {
      return (
        <Badge variant="default" className="bg-gradient-to-r from-yellow-400 to-yellow-600">
          <Crown className="mr-1 h-3 w-3" />
          VIP
        </Badge>
      )
    }
    return (
      <Badge variant="secondary">
        <Star className="mr-1 h-3 w-3" />
        通常会員
      </Badge>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {isLookupMode ? '顧客を検索' : '顧客を選択'}
          </DialogTitle>
          <DialogDescription>
            {isLookupMode
              ? '顧客を検索して詳細を確認できます。新規顧客の場合は「新規顧客登録」をクリックしてください。'
              : '予約を作成する顧客を選択してください。新規顧客の場合は「新規顧客登録」をクリックしてください。'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <Input
              type="text"
              placeholder="名前、電話番号、メールアドレス、会員番号で検索..."
              aria-label="顧客を検索"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {showLoadingState && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              検索中です…
            </div>
          )}
          {errorMessage && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              <span>{errorMessage}</span>
              {status === 'error' ? (
                <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
                  <RotateCcw className="mr-1 h-4 w-4" />
                  再試行
                </Button>
              ) : null}
            </div>
          )}

          {!selectedCustomer && !errorMessage ? (
            <Button onClick={handleNewCustomer} variant="outline" className="w-full justify-start">
              <UserPlus className="mr-2 h-4 w-4" />
              新規顧客を登録
            </Button>
          ) : null}

          {!isLookupMode && (
            <Button
              onClick={handleOpenTimeline}
              variant="secondary"
              className="w-full justify-start"
            >
              <Clock className="mr-2 h-4 w-4" />
              タイムラインを確認する
            </Button>
          )}

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <Card
                    key={customer.id}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      'cursor-pointer p-4 transition-all hover:shadow-md',
                      selectedCustomer?.id === customer.id && 'bg-purple-50 ring-2 ring-purple-600'
                    )}
                    onClick={() => handleCustomerSelect(customer)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        handleCustomerSelect(customer)
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-pink-400 font-semibold text-white">
                          {customer.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">{customer.name}</h3>
                            {getMemberBadge(customer.memberType)}
                          </div>
                          <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {customer.phone}
                            </span>
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {customer.email}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-gray-500">
                            会員番号: {customer.id} | ポイント: {customer.points}pt
                          </div>
                        </div>
                      </div>
                      {selectedCustomer?.id === customer.id && (
                        <ChevronRight className="h-5 w-5 text-purple-600" />
                      )}
                    </div>
                  </Card>
                ))
              ) : showLoadingState ? (
                <div className="py-8 text-center text-gray-500">
                  <Loader2 className="mx-auto mb-4 h-6 w-6 animate-spin text-gray-400" />
                  <p>検索中です…</p>
                </div>
              ) : status === 'error' ? (
                <div className="py-8 text-center text-gray-500">
                  <User className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                  <p>データを読み込めていません</p>
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  <User className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                  <p>検索条件に一致する顧客が見つかりません</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between border-t pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleProceed}
              disabled={!selectedCustomer || showLoadingState}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-70"
            >
              {isLookupMode ? '顧客詳細を開く' : 'この顧客で予約を作成'}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
