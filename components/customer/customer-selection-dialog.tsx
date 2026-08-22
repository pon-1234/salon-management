/**
 * @design_doc   docs/LEGACY_GOLD_ADMIN_MIGRATION_INVENTORY.md customer lookup
 * @related_to   CustomerRepositoryImpl server-side identity search
 * @known_issues None
 */
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
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
import {
  formatPhoneNumber,
  getCustomerPhoneIdentityVariants,
  normalizeCustomerPhoneIdentity,
  normalizeWritableCustomerPhoneIdentity,
} from '@/lib/customer/utils'
import { hasPermission } from '@/lib/auth/permissions'
import { useStore } from '@/contexts/store-context'

interface CustomerSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectCustomer?: (customer: Customer) => void
  mode?: 'reservation' | 'lookup'
}

type SearchStatus = 'idle' | 'loading' | 'ready' | 'error'
type FailedOperation = 'search' | null

export function CustomerSelectionDialog({
  open,
  onOpenChange,
  onSelectCustomer,
  mode = 'reservation',
}: CustomerSelectionDialogProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [status, setStatus] = useState<SearchStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [failedOperation, setFailedOperation] = useState<FailedOperation>(null)
  const [completedSearchTerm, setCompletedSearchTerm] = useState<string | null>(null)
  const [searchAttempt, setSearchAttempt] = useState(0)
  const router = useRouter()
  const { data: session } = useSession()
  const { currentStore } = useStore()
  const grantedPermissions = session?.user?.permissions ?? []
  const canReadCustomers = hasPermission(grantedPermissions, 'customer:read')
  const canCreateReservation = hasPermission(grantedPermissions, 'reservation:create')
  const canCreateCustomers = hasPermission(grantedPermissions, 'customer:create')
  const canUseDialog = canReadCustomers && (mode === 'lookup' || canCreateReservation)
  const wasOpenRef = useRef(false)
  const previousStoreIdRef = useRef(currentStore.id)
  const searchTermRef = useRef('')
  const searchRequestIdRef = useRef(0)

  const customerUseCases = useMemo(
    () => new CustomerUseCases(new CustomerRepositoryImpl(currentStore.id)),
    [currentStore.id]
  )
  const visibleCustomers = searchResults

  useEffect(() => {
    const storeChanged = previousStoreIdRef.current !== currentStore.id
    if (open && (!wasOpenRef.current || storeChanged)) {
      searchRequestIdRef.current += 1
      searchTermRef.current = ''
      setSearchTerm('')
      setSelectedCustomer(null)
      setErrorMessage(null)
      setFailedOperation(null)
      setCompletedSearchTerm(null)
      setSearchResults([])
      setStatus('idle')
    }
    previousStoreIdRef.current = currentStore.id
    wasOpenRef.current = open
  }, [currentStore.id, open])

  useEffect(() => {
    if (!open || !canUseDialog) {
      return
    }

    const trimmed = searchTerm.trim()
    if (searchTermRef.current.trim() !== trimmed) {
      return
    }

    const shouldSearchByPhone = normalizeCustomerPhoneIdentity(trimmed) !== null

    if (!trimmed) {
      searchRequestIdRef.current += 1
      setSearchResults([])
      setErrorMessage(null)
      setFailedOperation(null)
      setCompletedSearchTerm(null)
      setStatus('idle')
      return
    }

    let ignore = false
    const requestId = ++searchRequestIdRef.current
    setSearchResults([])
    setSelectedCustomer(null)
    setStatus('loading')
    setErrorMessage(null)
    setFailedOperation(null)
    setCompletedSearchTerm(null)

    const searchRequest = shouldSearchByPhone
      ? customerUseCases.searchByPhone(trimmed)
      : customerUseCases.search(trimmed)

    searchRequest
      .then((customers) => {
        if (ignore || requestId !== searchRequestIdRef.current) return
        setSearchResults(customers)
        setCompletedSearchTerm(trimmed)
        setStatus('ready')
      })
      .catch((error) => {
        if (ignore || requestId !== searchRequestIdRef.current) return
        console.error('Customer search failed:', error)
        setSearchResults([])
        setSelectedCustomer(null)
        setStatus('error')
        setFailedOperation('search')
        setErrorMessage('顧客検索に失敗しました。通信状態を確認して再試行してください。')
      })

    return () => {
      ignore = true
    }
  }, [searchTerm, open, canUseDialog, customerUseCases, searchAttempt])

  useEffect(() => {
    if (searchTerm.trim() && visibleCustomers.length === 1) {
      setSelectedCustomer(visibleCustomers[0])
      return
    }

    if (
      selectedCustomer &&
      !visibleCustomers.some((customer) => customer.id === selectedCustomer.id)
    ) {
      setSelectedCustomer(null)
    }
  }, [searchTerm, selectedCustomer, visibleCustomers])

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer)
    proceedWithCustomer(customer)
  }

  const proceedWithCustomer = (customer: Customer) => {
    if (mode === 'reservation' && !canCreateReservation) {
      return
    }

    if (onSelectCustomer) {
      onSelectCustomer(customer)
      onOpenChange(false)
      return
    }

    if (mode === 'lookup') {
      router.push(`/admin/customers/${encodeURIComponent(customer.id)}`)
    } else {
      router.push(`/admin/reservation?customerId=${encodeURIComponent(customer.id)}`)
    }
    onOpenChange(false)
  }

  const handleProceed = () => {
    if (selectedCustomer) {
      proceedWithCustomer(selectedCustomer)
    }
  }

  const handleNewCustomer = () => {
    if (mode === 'reservation' && !canCreateReservation) {
      return
    }

    const params = new URLSearchParams({
      returnTo: mode === 'reservation' ? 'reservation' : 'detail',
    })
    const writablePhone = normalizeWritableCustomerPhoneIdentity(searchTerm)
    if (!writablePhone) {
      return
    }
    const normalizedPhone = getCustomerPhoneIdentityVariants(writablePhone)[1]
    params.set('phone', normalizedPhone)
    params.set('store', currentStore.slug)
    router.push(`/admin/customers/new?${params.toString()}`)
    onOpenChange(false)
  }

  const handleRetry = () => {
    const operationToRetry = failedOperation
    if (!operationToRetry) {
      return
    }

    setErrorMessage(null)
    setFailedOperation(null)
    setCompletedSearchTerm(null)
    setSearchResults([])
    setSelectedCustomer(null)
    setStatus('loading')
    setSearchAttempt((attempt) => attempt + 1)
  }

  const handleOpenTimeline = () => {
    if (!canCreateReservation) {
      return
    }

    router.push('/admin/reservation')
    onOpenChange(false)
  }

  const showLoadingState = status === 'loading'
  const isLookupMode = mode === 'lookup'
  const trimmedSearchTerm = searchTerm.trim()
  const canOfferNewCustomer =
    canCreateCustomers &&
    status === 'ready' &&
    visibleCustomers.length === 0 &&
    completedSearchTerm === trimmedSearchTerm &&
    normalizeWritableCustomerPhoneIdentity(completedSearchTerm ?? '') !== null

  if (!canReadCustomers) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>顧客情報を開けません</DialogTitle>
            <DialogDescription>この操作には顧客情報の閲覧権限が必要です。</DialogDescription>
          </DialogHeader>
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            顧客情報の閲覧権限がありません。
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              閉じる
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (mode === 'reservation' && !canCreateReservation) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>予約作成を開けません</DialogTitle>
            <DialogDescription>この操作には予約作成の権限が必要です。</DialogDescription>
          </DialogHeader>
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            予約作成の権限がありません。
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              閉じる
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

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
              onChange={(event) => {
                const nextSearchTerm = event.target.value
                searchRequestIdRef.current += 1
                searchTermRef.current = nextSearchTerm
                setSearchTerm(nextSearchTerm)
                setSelectedCustomer(null)
                setErrorMessage(null)
                setFailedOperation(null)
                setCompletedSearchTerm(null)
                const hasSearchTerm = nextSearchTerm.trim().length > 0
                setSearchResults([])
                setStatus(hasSearchTerm ? 'loading' : 'idle')
              }}
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
              {status === 'error' && failedOperation ? (
                <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
                  <RotateCcw className="mr-1 h-4 w-4" />
                  再試行
                </Button>
              ) : null}
            </div>
          )}

          {!selectedCustomer && !errorMessage && canOfferNewCustomer ? (
            <Button onClick={handleNewCustomer} variant="outline" className="w-full justify-start">
              <UserPlus className="mr-2 h-4 w-4" />
              新規顧客を登録
            </Button>
          ) : null}

          {status === 'idle' && !errorMessage ? (
            <p className="py-6 text-center text-sm text-gray-500">
              名前、電話番号、メールアドレス、会員番号で検索すると顧客が表示されます。
            </p>
          ) : null}

          {(status === 'idle' || status === 'ready') && !isLookupMode && !onSelectCustomer ? (
            <Button
              onClick={handleOpenTimeline}
              variant="secondary"
              className="w-full justify-start"
            >
              <Clock className="mr-2 h-4 w-4" />
              タイムラインを確認する
            </Button>
          ) : null}

          {status === 'ready' ? (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {visibleCustomers.length > 0 ? (
                  visibleCustomers.map((customer) => (
                    <Card
                      key={customer.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`${customer.name} ${formatPhoneNumber(customer.phone)}`}
                      className={cn(
                        'cursor-pointer p-4 transition-all hover:shadow-md',
                        selectedCustomer?.id === customer.id &&
                          'bg-purple-50 ring-2 ring-purple-600'
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
                                {formatPhoneNumber(customer.phone)}
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
                ) : (
                  <div className="py-8 text-center text-gray-500">
                    <User className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                    <p>検索条件に一致する顧客が見つかりません</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : null}

          <div className="flex items-center justify-between border-t pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            {status === 'idle' || status === 'ready' ? (
              <Button
                onClick={handleProceed}
                disabled={!selectedCustomer}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-70"
              >
                {isLookupMode ? '顧客詳細を開く' : 'この顧客で予約を作成'}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
