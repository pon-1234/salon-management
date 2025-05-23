"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from 'lucide-react'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Customer } from "@/lib/types/chat"
import { getCustomers } from "@/lib/chat/utils"

interface CustomerListProps {
  selectedCustomerId: string | undefined
  onSelectCustomer: (customer: Customer | null) => void
}

export function CustomerList({ selectedCustomerId, onSelectCustomer }: CustomerListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [customers, setCustomers] = useState<Customer[]>([])

  useEffect(() => {
    const fetchedCustomers = getCustomers()
    setCustomers(fetchedCustomers)
  }, [])

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="w-[320px] border-r bg-white flex flex-col">
      <div className="p-4 border-b">
        <div className="text-sm font-medium mb-4">チャット</div>
        <div className="relative">
          <Input
            placeholder="お客様名を検索"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
      </div>
      <div className="border-b px-4 py-2">
        <Button variant="ghost" className="w-full justify-start text-emerald-600">
          一括送信
        </Button>
      </div>
      <ScrollArea className="flex-1">
        {filteredCustomers.map((customer) => (
          <button
            key={customer.id}
            className={`w-full text-left p-4 border-b hover:bg-gray-50 ${
              selectedCustomerId === customer.id ? "bg-gray-50" : ""
            }`}
            onClick={() => onSelectCustomer(customer)}
          >
            <div className="flex justify-between items-start mb-1">
              <span className="font-medium">{customer.name} 様</span>
              <span className="text-xs text-gray-500">{customer.lastMessageTime}</span>
            </div>
            <p className="text-sm text-gray-600 line-clamp-2">{customer.lastMessage}</p>
          </button>
        ))}
      </ScrollArea>
    </div>
  )
}
