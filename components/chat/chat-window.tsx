"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Message } from "@/lib/types/chat"
import { getMessages, addMessage } from "@/lib/chat/utils"

interface ChatWindowProps {
  customerId: string | undefined
}

export function ChatWindow({ customerId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
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

  if (!customerId) {
    return <div className="flex-1 bg-gray-100 flex items-center justify-center">顧客を選択してください</div>
  }

  return (
    <div className="flex-1 bg-gray-100 flex flex-col">
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === "staff" ? "justify-end" : "justify-start"
              }`}
            >
              <div className={`max-w-[85%] ${message.isReservationInfo ? "w-full" : ""}`}>
                <div
                  className={`rounded-lg p-4 whitespace-pre-wrap ${
                    message.sender === "staff"
                      ? "bg-emerald-600 text-white"
                      : "bg-white"
                  }`}
                >
                  {message.content}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">{message.timestamp}</span>
                  {message.readStatus && (
                    <span className="text-xs text-gray-500">{message.readStatus}</span>
                  )}
                </div>
                {message.isReservationInfo && (
                  <div className="flex flex-col items-center gap-2 mt-2">
                    <Badge variant="secondary" className="bg-gray-200 w-fit text-center">
                      予約が確定に変更されました
                      <br />
                      {message.reservationInfo?.date} {message.reservationInfo?.time}
                    </Badge>
                    <Badge variant="secondary" className="bg-gray-200 w-fit text-center">
                      {message.reservationInfo?.confirmedDate}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="border-t bg-white p-4">
        <div className="max-w-3xl mx-auto flex gap-2">
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
            className="min-h-[44px] max-h-[120px]"
          />
          <Button 
            onClick={handleSendMessage}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            送信
          </Button>
        </div>
      </div>
    </div>
  )
}
