"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Send, Crown } from 'lucide-react'
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
    <div className="w-[320px] md:w-[360px] border-r bg-gradient-to-b from-white to-gray-50/50 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
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
            className="pl-10 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
      </div>

      {/* Bulk Send Button */}
      <div className="px-4 py-3 border-b bg-white/60">
        <Button variant="ghost" className="w-full justify-start text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
          <Send className="h-4 w-4 mr-2" />
          一括送信
        </Button>
      </div>

      {/* Customer List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredCustomers.map((customer) => (
            <button
              key={customer.id}
              className={`w-full text-left p-3 rounded-lg mb-2 transition-all duration-200 hover:shadow-sm ${
                selectedCustomerId === customer.id 
                  ? "bg-emerald-50 border border-emerald-200 shadow-sm" 
                  : "hover:bg-white"
              }`}
              onClick={() => onSelectCustomer(customer)}
            >
              <div className="flex items-start gap-3">
                {/* Avatar with online indicator */}
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={customer.avatar} alt={customer.name} />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-medium">
                      {customer.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  {customer.isOnline && (
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">
                        {customer.name} 様
                      </span>
                      {customer.memberType === "vip" && (
                        <Crown className="h-3 w-3 text-amber-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {customer.lastMessageTime}
                      </span>
                      {customer.hasUnread && customer.unreadCount > 0 && (
                        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[20px] h-5 text-xs px-1.5">
                          {customer.unreadCount > 99 ? "99+" : customer.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                    {customer.lastMessage}
                  </p>
                  
                  {!customer.isOnline && customer.lastSeen && (
                    <p className="text-xs text-gray-400 mt-1">
                      最終ログイン: {customer.lastSeen}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
