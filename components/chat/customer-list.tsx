'use client'

/**
 * @design_doc   Large migrated customer ledgers use bounded server-side chat search
 * @related_to   /api/chat/customers and ChatPage deep links
 * @known_issues Presence is displayed only when a real presence source becomes available
 */
import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, Crown } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Customer } from '@/lib/types/chat'
import { toast } from '@/hooks/use-toast'
import { isVipMember } from '@/lib/utils'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useStore } from '@/contexts/store-context'

interface CustomerListProps {
  selectedCustomerId: string | undefined
  onSelectCustomer: (customer: Customer | null) => void
}

export function CustomerList({ selectedCustomerId, onSelectCustomer }: CustomerListProps) {
  const { currentStore } = useStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  const formatTimestamp = useCallback((value?: string) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return format(date, 'yyyy-MM-dd HH:mm', { locale: ja })
  }, [])

  const fetchCustomers = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (searchQuery.trim()) {
          params.set('query', searchQuery.trim())
        }
        params.set('limit', '50')
        params.set('storeId', currentStore.id)

        const response = await fetch(`/api/chat/customers?${params.toString()}`, {
          credentials: 'include',
          cache: 'no-store',
          signal,
        })
        if (!response.ok) throw new Error('Failed to fetch customers')

        const data = await response.json()
        // SuccessResponse形式からデータを取得
        const customerData = data.data || data
        const normalized = Array.isArray(customerData) ? customerData : []
        setCustomers(normalized)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
        console.error('Error fetching customers:', error)
        toast({
          title: 'エラー',
          description: '顧客リストの取得に失敗しました',
          variant: 'destructive',
        })
      } finally {
        if (!signal?.aborted) {
          setLoading(false)
        }
      }
    },
    [currentStore.id, searchQuery]
  )

  useEffect(() => {
    const controller = new AbortController()
    setCustomers([])
    setLoading(true)
    const timeoutId = window.setTimeout(() => {
      void fetchCustomers(controller.signal)
    }, 250)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [fetchCustomers])

  useEffect(() => {
    const handleMessagesRead = (event: Event) => {
      const customEvent = event as CustomEvent<{ customerId?: string }>
      const customerId = customEvent.detail?.customerId
      if (!customerId) return

      setCustomers((prev) =>
        prev.map((customer) =>
          customer.id === customerId ? { ...customer, hasUnread: false, unreadCount: 0 } : customer
        )
      )
    }

    window.addEventListener('chat:messagesRead', handleMessagesRead as EventListener)

    return () => {
      window.removeEventListener('chat:messagesRead', handleMessagesRead as EventListener)
    }
  }, [])

  return (
    <div
      data-testid="chat-customer-list"
      className="flex h-full min-h-0 w-[280px] flex-col overflow-hidden border-r bg-gradient-to-b from-white to-gray-50/50 md:w-[320px]"
    >
      {/* Header */}
      <div className="shrink-0 border-b bg-white/80 p-3 backdrop-blur-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">チャット</h2>
          <Badge variant="secondary" className="text-xs">
            {customers.length}
          </Badge>
        </div>
        <div className="relative">
          <Input
            placeholder="お客様名を検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-gray-200 bg-gray-50 pl-10 transition-colors focus:bg-white"
          />
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
        </div>
      </div>

      {/* Customer List */}
      <ScrollArea className="min-h-0 flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : (
          <div className="p-1.5">
            {customers.map((customer) => (
              <button
                key={customer.id}
                className={`mb-1 w-full rounded-lg px-2 py-2 text-left transition-all duration-200 hover:shadow-sm ${
                  selectedCustomerId === customer.id
                    ? 'border border-emerald-200 bg-emerald-50 shadow-sm'
                    : 'hover:bg-white'
                }`}
                onClick={() => onSelectCustomer(customer)}
              >
                <div className="flex items-start gap-2">
                  {/* Avatar with online indicator */}
                  <div className="relative">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={customer.avatar} alt={customer.name} />
                      <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-emerald-600 text-xs font-medium text-white">
                        {customer.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    {customer.isOnline && (
                      <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-green-500"></div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-gray-900">
                          {customer.name} 様
                        </span>
                        {isVipMember(customer.memberType) && (
                          <Crown className="h-3 w-3 text-amber-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(customer.lastMessageTime)}
                        </span>
                        {customer.hasUnread && customer.unreadCount > 0 && (
                          <Badge className="h-5 min-w-[20px] bg-emerald-600 px-1.5 text-xs text-white hover:bg-emerald-700">
                            {customer.unreadCount > 99 ? '99+' : customer.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <p className="line-clamp-1 text-sm leading-relaxed text-gray-600">
                      {customer.lastMessage}
                    </p>

                    {!customer.isOnline && customer.lastSeen && (
                      <p className="mt-1 text-xs text-gray-400">
                        最終ログイン: {formatTimestamp(customer.lastSeen)}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
