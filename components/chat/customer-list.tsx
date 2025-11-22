'use client'

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

interface CustomerListProps {
  selectedCustomerId: string | undefined
  onSelectCustomer: (customer: Customer | null) => void
}

export function CustomerList({ selectedCustomerId, onSelectCustomer }: CustomerListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  const formatTimestamp = useCallback((value?: string) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return format(date, 'yyyy-MM-dd HH:mm', { locale: ja })
  }, [])

  const fetchCustomers = useCallback(async () => {
    try {
      const response = await fetch('/api/chat/customers', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!response.ok) throw new Error('Failed to fetch customers')

      const data = await response.json()
      // SuccessResponse形式からデータを取得
      const customerData = data.data || data
      const normalized = Array.isArray(customerData) ? customerData : []
      setCustomers(normalized)
    } catch (error) {
      console.error('Error fetching customers:', error)
      toast({
        title: 'エラー',
        description: '顧客リストの取得に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  useEffect(() => {
    const handleMessagesRead = (event: Event) => {
      const customEvent = event as CustomEvent<{ customerId?: string }>
      const customerId = customEvent.detail?.customerId
      if (!customerId) return

      setCustomers((prev) =>
        prev.map((customer) =>
          customer.id === customerId
            ? { ...customer, hasUnread: false, unreadCount: 0 }
            : customer
        )
      )
    }

    window.addEventListener('chat:messagesRead', handleMessagesRead as EventListener)

    return () => {
      window.removeEventListener('chat:messagesRead', handleMessagesRead as EventListener)
    }
  }, [])

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex h-full w-[320px] flex-col border-r bg-gradient-to-b from-white to-gray-50/50 md:w-[360px]">
      {/* Header */}
      <div className="border-b bg-white/80 p-4 backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">チャット</h2>
          <Badge variant="secondary" className="text-xs">
            {filteredCustomers.length}
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
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : (
          <div className="p-2">
            {filteredCustomers.map((customer) => (
              <button
                key={customer.id}
                className={`mb-2 w-full rounded-lg p-3 text-left transition-all duration-200 hover:shadow-sm ${
                  selectedCustomerId === customer.id
                    ? 'border border-emerald-200 bg-emerald-50 shadow-sm'
                    : 'hover:bg-white'
                }`}
                onClick={() => onSelectCustomer(customer)}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar with online indicator */}
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={customer.avatar} alt={customer.name} />
                      <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-emerald-600 font-medium text-white">
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

                    <p className="line-clamp-2 text-sm leading-relaxed text-gray-600">
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
