"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, Check, CheckCheck } from 'lucide-react'
import { Message } from "@/lib/types/chat"
import { getMessages, addMessage } from "@/lib/chat/utils"
import { getCustomers } from "@/lib/chat/utils"

interface ChatWindowProps {
  customerId: string | undefined
}

export function ChatWindow({ customerId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (customerId) {
      const customerMessages = getMessages(customerId)
      setMessages(customerMessages)
    }
  }, [customerId])

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = () => {
    if (newMessage.trim() && customerId) {
      const newMsg = addMessage({
        sender: "staff",
        content: newMessage.trim(),
        timestamp: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
        customerId: customerId
      })
      setMessages([...messages, newMsg])
      setNewMessage("")
    }
  }

  const customer = customerId ? getCustomers().find(c => c.id === customerId) : null

  if (!customerId) {
    return (
      <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-gray-400">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-lg text-gray-600 font-medium">顧客を選択してください</p>
          <p className="text-sm text-gray-500 mt-2">左側のリストから顧客を選択して<br />チャットを開始してください</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-gradient-to-b from-white to-gray-50/30 flex flex-col">
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message, index) => {
            const showAvatar = index === 0 || messages[index - 1]?.sender !== message.sender
            const isStaff = message.sender === "staff"
            
            return (
              <div
                key={message.id}
                className={`flex ${isStaff ? "justify-end" : "justify-start"} ${
                  message.isReservationInfo ? "justify-center" : ""
                }`}
              >
                <div className={`flex gap-3 max-w-[80%] ${
                  isStaff ? "flex-row-reverse" : "flex-row"
                } ${message.isReservationInfo ? "w-full max-w-md" : ""}`}>
                  
                  {/* Avatar */}
                  {showAvatar && !message.isReservationInfo && (
                    <Avatar className="h-8 w-8 mt-1">
                      {isStaff ? (
                        <AvatarFallback className="bg-emerald-600 text-white text-xs">
                          Staff
                        </AvatarFallback>
                      ) : (
                        <AvatarImage src={customer?.avatar} alt={customer?.name} />
                      )}
                      {!isStaff && (
                        <AvatarFallback className="bg-gray-400 text-white text-xs">
                          {customer?.name?.[0] || "G"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  )}
                  
                  {!showAvatar && !message.isReservationInfo && (
                    <div className="w-8" />
                  )}

                  <div className="flex-1">
                    {/* Message Bubble */}
                    <div
                      className={`relative rounded-2xl px-4 py-3 whitespace-pre-wrap shadow-sm ${
                        message.isReservationInfo
                          ? "bg-blue-50 border border-blue-200 text-blue-800 text-center"
                          : isStaff
                          ? "bg-emerald-500 text-white"
                          : "bg-white border border-gray-200"
                      }`}
                    >
                      {message.content}
                      
                      {/* Message tail */}
                      {!message.isReservationInfo && showAvatar && (
                        <>
                          {isStaff ? (
                            <div
                              className="absolute top-3 right-[-8px] w-0 h-0 border-l-[8px] border-l-emerald-500 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent"
                            />
                          ) : (
                            <>
                              {/* Main arrow */}
                              <div
                                className="absolute top-3 left-[-8px] w-0 h-0 border-r-[8px] border-r-white border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent"
                              />
                              {/* Border arrow for outline effect */}
                              <div
                                className="absolute top-3 left-[-9px] w-0 h-0 border-r-[9px] border-r-gray-200 border-t-[9px] border-t-transparent border-b-[9px] border-b-transparent"
                              />
                            </>
                          )}
                        </>
                      )}
                    </div>
                    
                    {/* Timestamp and Status */}
                    <div className={`flex items-center gap-2 mt-1 ${
                      isStaff ? "justify-end" : "justify-start"
                    }`}>
                      <span className="text-xs text-gray-500">{message.timestamp}</span>
                      {isStaff && (
                        <div className="text-xs text-gray-500">
                          {message.readStatus === "既読" ? (
                            <CheckCheck className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Reservation Info */}
                    {message.isReservationInfo && (
                      <div className="flex flex-col items-center gap-2 mt-3">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                          予約が確定に変更されました
                        </Badge>
                        <div className="text-sm text-blue-700 font-medium">
                          {message.reservationInfo?.date} {message.reservationInfo?.time}
                        </div>
                        <div className="text-xs text-blue-600">
                          確定日時: {message.reservationInfo?.confirmedDate}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex gap-3 max-w-[80%]">
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarImage src={customer?.avatar} alt={customer?.name} />
                  <AvatarFallback className="bg-gray-400 text-white text-xs">
                    {customer?.name?.[0] || "G"}
                  </AvatarFallback>
                </Avatar>
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-white/80 backdrop-blur-sm p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-3">
            {/* Message Input */}
            <div className="flex-1 relative">
              <Textarea
                placeholder="メッセージを入力..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                className="min-h-[44px] max-h-[120px] resize-none border-gray-200 focus:border-emerald-300 focus:ring-emerald-200"
              />
            </div>
            
            {/* Send Button */}
            <Button 
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed h-11 px-4"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
