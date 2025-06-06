"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { ChatWindow } from "@/components/chat/chat-window"
import { CustomerList } from "@/components/chat/customer-list"
import { CustomerHeader } from "@/components/chat/customer-header"
import { Customer } from "@/lib/types/chat"
import { getCustomers } from "@/lib/chat/utils" // utilsからのインポートに変更

export default function ChatPage() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />
      <div className="flex h-[calc(100vh-73px)] max-w-7xl mx-auto">
        {/* Customer List - Hidden on mobile when customer selected */}
        <div className={`${
          selectedCustomer ? 'hidden md:block' : 'block'
        } transition-all duration-300`}>
          <CustomerList 
            selectedCustomerId={selectedCustomer?.id}
            onSelectCustomer={setSelectedCustomer}
          />
        </div>
        
        {/* Chat Window */}
        <div className={`flex-1 flex flex-col ${
          !selectedCustomer ? 'hidden md:flex' : 'flex'
        } bg-white rounded-l-lg shadow-sm border border-gray-200`}>
          <CustomerHeader customer={selectedCustomer || undefined} />
          <ChatWindow customerId={selectedCustomer?.id} />
        </div>
      </div>
    </div>
  )
}
