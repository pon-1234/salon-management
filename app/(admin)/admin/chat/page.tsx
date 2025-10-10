'use client'

import { useState } from 'react'
import { ChatWindow } from '@/components/chat/chat-window'
import { CustomerList } from '@/components/chat/customer-list'
import { CustomerHeader } from '@/components/chat/customer-header'
import { CastList } from '@/components/chat/cast-list'
import { CastHeader } from '@/components/chat/cast-header'
import { Customer, CastChatEntry } from '@/lib/types/chat'
import { Button } from '@/components/ui/button'

export default function ChatPage() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedCast, setSelectedCast] = useState<CastChatEntry | null>(null)
  const [activePane, setActivePane] = useState<'customer' | 'cast'>('customer')

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-2 border-b bg-white px-4 py-2">
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
  )
}
