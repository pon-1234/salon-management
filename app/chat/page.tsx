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
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex h-[calc(100vh-73px)]">
        <CustomerList 
          selectedCustomerId={selectedCustomer?.id}
          onSelectCustomer={setSelectedCustomer}
        />
        <div className="flex-1 flex flex-col">
          <CustomerHeader customer={selectedCustomer || undefined} />
          <ChatWindow customerId={selectedCustomer?.id} />
        </div>
      </div>
    </div>
  )
}
