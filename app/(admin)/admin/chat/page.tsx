'use client'

/**
 * @design_doc   Customer and cast chat deep-link selection
 * @related_to   CustomerList, CastList, chat participant APIs
 * @known_issues Customer-list pagination is handled separately
 */
import { useEffect, useState } from 'react'
import { ChatWindow } from '@/components/chat/chat-window'
import { CustomerList } from '@/components/chat/customer-list'
import { CustomerHeader } from '@/components/chat/customer-header'
import { CastList } from '@/components/chat/cast-list'
import { CastHeader } from '@/components/chat/cast-header'
import { Customer, CastChatEntry } from '@/lib/types/chat'
import { Button } from '@/components/ui/button'
import { useSearchParams } from 'next/navigation'
import { ChatBroadcastDialog } from '@/components/chat/chat-broadcast-dialog'
import { useStore } from '@/contexts/store-context'

const CUSTOMER_LOAD_ERROR =
  '対象の顧客チャットを開けませんでした。顧客情報を確認して再度お試しください。'
const CAST_LOAD_ERROR =
  '対象のキャストチャットを開けませんでした。現在の店舗とキャスト情報を確認してください。'

export default function ChatPage() {
  const { currentStore } = useStore()
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedCast, setSelectedCast] = useState<CastChatEntry | null>(null)
  const [activePane, setActivePane] = useState<'customer' | 'cast'>('customer')
  const [broadcastOpen, setBroadcastOpen] = useState(false)
  const [selectionError, setSelectionError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const initialCustomerId = searchParams.get('customerId')
  const initialCastId = searchParams.get('castId')

  useEffect(() => {
    setSelectedCustomer(null)
    setSelectedCast(null)
    setSelectionError(null)
  }, [currentStore.id])

  useEffect(() => {
    if (!initialCustomerId) {
      return
    }

    let ignore = false
    setActivePane('customer')
    setSelectedCast(null)
    setSelectedCustomer(null)
    setSelectionError(null)

    const loadCustomer = async () => {
      try {
        const response = await fetch(
          `/api/chat/customers?id=${encodeURIComponent(initialCustomerId)}&storeId=${encodeURIComponent(currentStore.id)}`,
          {
            credentials: 'include',
          }
        )
        if (!response.ok) {
          throw new Error(`Failed to fetch customer: ${response.status}`)
        }

        const payload = await response.json()
        const customer = (payload?.data ?? payload) as Customer | null
        if (!customer || customer.id !== initialCustomerId) {
          throw new Error('Requested customer was not returned')
        }

        if (!ignore) {
          setSelectedCustomer(customer)
        }
      } catch (error) {
        console.warn('Failed to hydrate customer selection from query:', error)
        if (!ignore) {
          setSelectedCustomer(null)
          setSelectionError(CUSTOMER_LOAD_ERROR)
        }
      }
    }

    void loadCustomer()

    return () => {
      ignore = true
    }
  }, [currentStore.id, initialCustomerId])

  useEffect(() => {
    if (!initialCastId || initialCustomerId) {
      return
    }

    setSelectionError(null)
    setActivePane('cast')
    setSelectedCustomer(null)
    setSelectedCast(null)

    const loadCast = async () => {
      try {
        const response = await fetch(
          `/api/chat/casts?id=${encodeURIComponent(initialCastId)}&storeId=${encodeURIComponent(currentStore.id)}`,
          {
            credentials: 'include',
          }
        )
        if (!response.ok) {
          throw new Error(`Failed to fetch cast: ${response.status}`)
        }
        const payload = await response.json()
        const cast = (payload?.data ?? payload) as CastChatEntry | null
        if (!cast || cast.id !== initialCastId) {
          throw new Error('Requested cast was not returned')
        }
        setSelectedCast(cast)
      } catch (error) {
        console.warn('Failed to hydrate cast selection from query:', error)
        setSelectedCast(null)
        setSelectionError(CAST_LOAD_ERROR)
      }
    }

    void loadCast()
  }, [currentStore.id, initialCastId, initialCustomerId])

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="flex flex-wrap gap-2 border-b bg-white px-4 py-2">
          <Button
            variant={activePane === 'customer' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setActivePane('customer')
              setSelectionError(null)
            }}
          >
            顧客チャット
          </Button>
          <Button
            variant={activePane === 'cast' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setActivePane('cast')
              setSelectionError(null)
            }}
          >
            キャストチャット
          </Button>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => setBroadcastOpen(true)}>
            一括送信
          </Button>
        </div>

        {selectionError ? (
          <div
            role="alert"
            className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {selectionError}
          </div>
        ) : null}

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
                  setSelectionError(null)
                  setSelectedCustomer(customer)
                  setSelectedCast(null)
                }}
              />
            ) : (
              <CastList
                selectedCastId={selectedCast?.id}
                onSelectCast={(cast) => {
                  setSelectionError(null)
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
              participantId={activePane === 'customer' ? selectedCustomer?.id : selectedCast?.id}
            />
          </div>
        </div>
      </div>
      <ChatBroadcastDialog open={broadcastOpen} onOpenChange={setBroadcastOpen} />
    </>
  )
}
