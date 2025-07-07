'use client'

import { useState } from 'react'
import { ChatWindow } from '@/components/chat/chat-window'
import { CustomerList } from '@/components/chat/customer-list'
import { CustomerHeader } from '@/components/chat/customer-header'
import { Customer } from '@/lib/types/chat'
import { getCustomers } from '@/lib/chat/utils' // utilsからのインポートに変更

export default function ChatPage() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  return (
    <div className="flex h-full">
      {/* Customer List - Hidden on mobile when customer selected */}
      <div
        className={`${selectedCustomer ? 'hidden md:block' : 'block'} transition-all duration-300`}
      >
        <CustomerList
          selectedCustomerId={selectedCustomer?.id}
          onSelectCustomer={setSelectedCustomer}
        />
      </div>

      {/* Chat Window */}
      <div
        className={`flex flex-1 flex-col ${
          !selectedCustomer ? 'hidden md:flex' : 'flex'
        } rounded-l-lg border border-gray-200 bg-white shadow-sm`}
      >
        <CustomerHeader customer={selectedCustomer || undefined} />
        <ChatWindow customerId={selectedCustomer?.id} />
      </div>
    </div>
  )
}
