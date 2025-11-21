'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChatWindow } from '@/components/chat/chat-window'
import { CustomerList } from '@/components/chat/customer-list'
import { CustomerHeader } from '@/components/chat/customer-header'
import { CastList } from '@/components/chat/cast-list'
import { CastHeader } from '@/components/chat/cast-header'
import { Customer, CastChatEntry } from '@/lib/types/chat'
import { Button } from '@/components/ui/button'
import { useSearchParams } from 'next/navigation'
import { ChatBroadcastDialog } from '@/components/chat/chat-broadcast-dialog'

export default function ChatPage() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedCast, setSelectedCast] = useState<CastChatEntry | null>(null)
  const [activePane, setActivePane] = useState<'customer' | 'cast'>('customer')
  const [broadcastOpen, setBroadcastOpen] = useState(false)
  const searchParams = useSearchParams()
  const initialCastId = searchParams.get('castId')

  useEffect(() => {
    if (!initialCastId) {
      return
    }

    setActivePane('cast')
    setSelectedCustomer(null)

    const loadCast = async () => {
      try {
        const response = await fetch(`/api/chat/casts?id=${encodeURIComponent(initialCastId)}`, {
          credentials: 'include',
        })
        if (!response.ok) {
          throw new Error(`Failed to fetch cast: ${response.status}`)
        }
        const payload = await response.json()
        const cast = (payload?.data ?? payload) as CastChatEntry | null
        if (cast) {
          setSelectedCast(cast)
        } else {
          setSelectedCast({
            id: initialCastId,
            name: `キャスト(${initialCastId.slice(0, 6)})`,
            lastMessage: '',
            lastMessageTime: '',
            hasUnread: false,
            unreadCount: 0,
            isOnline: false,
            status: 'オフライン',
          })
        }
      } catch (error) {
        console.warn('Failed to hydrate cast selection from query:', error)
        setSelectedCast({
          id: initialCastId,
          name: `キャスト(${initialCastId.slice(0, 6)})`,
          lastMessage: '',
          lastMessageTime: '',
          hasUnread: false,
          unreadCount: 0,
          isOnline: false,
          status: 'オフライン',
        })
      }
    }

    void loadCast()
  }, [initialCastId])

  return (
    <>
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap gap-2 border-b bg-white px-4 py-2">
        <Button
          variant={activePane === 'customer' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActivePane('customer')}
        >
          顧客チャット
        </Button>
        <Button
          variant={activePane === 'cast' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActivePane('cast')}
        >
          キャストチャット
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => setBroadcastOpen(true)}>
          一括送信
        </Button>
      </div>

      <div className="flex h-full flex-1">
        <div
          className={`transition-all duration-300 ${
            activePane === 'customer'
              ? selectedCustomer
                ? 'hidden md:block'
                : 'block'
              : selectedCast
                ? 'hidden md:block'
                : 'block'
          }`}
        >
          {activePane === 'customer' ? (
            <CustomerList
              selectedCustomerId={selectedCustomer?.id}
              onSelectCustomer={(customer) => {
                setSelectedCustomer(customer)
                setSelectedCast(null)
              }}
            />
          ) : (
            <CastList
              selectedCastId={selectedCast?.id}
              onSelectCast={(cast) => {
                setSelectedCast(cast)
                setSelectedCustomer(null)
              }}
            />
          )}
        </div>

        <div
          className={`flex flex-1 flex-col rounded-l-lg border border-gray-200 bg-white shadow-sm ${
            (activePane === 'customer' && !selectedCustomer) ||
            (activePane === 'cast' && !selectedCast)
              ? 'hidden md:flex'
              : 'flex'
          }`}
        >
          {activePane === 'customer' ? (
            <CustomerHeader customer={selectedCustomer || undefined} />
          ) : (
            <CastHeader cast={selectedCast || undefined} />
          )}
          <ChatWindow
            participantType={activePane}
            participantId={
              activePane === 'customer' ? selectedCustomer?.id : selectedCast?.id
            }
          />
        </div>
      </div>
    </div>
    <ChatBroadcastDialog open={broadcastOpen} onOpenChange={setBroadcastOpen} />
    </>
  )
}
