'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Send, Check, CheckCheck } from 'lucide-react'
import { Message } from '@/lib/types/chat'
import { toast } from '@/hooks/use-toast'

interface ChatWindowProps {
  customerId: string | undefined
}

export function ChatWindow({ customerId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [customer, setCustomer] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const fetchMessages = useCallback(async () => {
    if (!customerId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/chat?customerId=${customerId}`)
      if (!response.ok) throw new Error('Failed to fetch messages')

      const data = await response.json()
      // SuccessResponse形式からデータを取得
      const messageData = data.data || data
      setMessages(Array.isArray(messageData) ? messageData : [])
    } catch (error) {
      console.error('Error fetching messages:', error)
      toast({
        title: 'エラー',
        description: 'メッセージの取得に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [customerId])

  const fetchCustomer = useCallback(async () => {
    if (!customerId) return

    try {
      const response = await fetch(`/api/chat/customers?id=${customerId}`)
      if (!response.ok) throw new Error('Failed to fetch customer')

      const data = await response.json()
      // SuccessResponse形式からデータを取得
      const customerData = data.data || data
      setCustomer(customerData)
    } catch (error) {
      console.error('Error fetching customer:', error)
    }
  }, [customerId])

  useEffect(() => {
    if (customerId) {
      fetchMessages()
      fetchCustomer()
    }
  }, [customerId, fetchMessages, fetchCustomer])

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (newMessage.trim() && customerId) {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerId,
            sender: 'staff',
            content: newMessage.trim(),
          }),
        })

        if (!response.ok) throw new Error('Failed to send message')

        const newMsg = await response.json()
        setMessages([...messages, newMsg])
        setNewMessage('')
      } catch (error) {
        console.error('Error sending message:', error)
        toast({
          title: 'エラー',
          description: 'メッセージの送信に失敗しました',
          variant: 'destructive',
        })
      }
    }
  }

  if (!customerId) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="mb-4 text-gray-400">
            <svg
              className="mx-auto h-16 w-16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <p className="text-lg font-medium text-gray-600">顧客を選択してください</p>
          <p className="mt-2 text-sm text-gray-500">
            左側のリストから顧客を選択して
            <br />
            チャットを開始してください
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col bg-gradient-to-b from-white to-gray-50/30">
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-6">
            {messages.map((message, index) => {
              const showAvatar = index === 0 || messages[index - 1]?.sender !== message.sender
              const isStaff = message.sender === 'staff'

              return (
                <div
                  key={message.id}
                  className={`flex ${isStaff ? 'justify-end' : 'justify-start'} ${
                    message.isReservationInfo ? 'justify-center' : ''
                  }`}
                >
                  <div
                    className={`flex max-w-[80%] gap-3 ${
                      isStaff ? 'flex-row-reverse' : 'flex-row'
                    } ${message.isReservationInfo ? 'w-full max-w-md' : ''}`}
                  >
                    {/* Avatar */}
                    {showAvatar && !message.isReservationInfo && (
                      <Avatar className="mt-1 h-8 w-8">
                        {isStaff ? (
                          <AvatarFallback className="bg-emerald-600 text-xs text-white">
                            Staff
                          </AvatarFallback>
                        ) : (
                          <AvatarImage src={customer?.avatar} alt={customer?.name} />
                        )}
                        {!isStaff && (
                          <AvatarFallback className="bg-gray-400 text-xs text-white">
                            {customer?.name?.[0] || 'G'}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    )}

                    {!showAvatar && !message.isReservationInfo && <div className="w-8" />}

                    <div className="flex-1">
                      {/* Message Bubble */}
                      <div
                        className={`relative whitespace-pre-wrap rounded-2xl px-4 py-3 shadow-sm ${
                          message.isReservationInfo
                            ? 'border border-blue-200 bg-blue-50 text-center text-blue-800'
                            : isStaff
                              ? 'bg-emerald-500 text-white'
                              : 'border border-gray-200 bg-white'
                        }`}
                      >
                        {message.content}

                        {/* Message tail */}
                        {!message.isReservationInfo && (
                          <>
                            {isStaff && showAvatar ? (
                              <div className="absolute right-[-8px] top-3 h-0 w-0 border-b-[8px] border-l-[8px] border-t-[8px] border-b-transparent border-l-emerald-500 border-t-transparent" />
                            ) : !isStaff && showAvatar ? (
                              <>
                                {/* Main arrow */}
                                <div className="absolute left-[-8px] top-3 h-0 w-0 border-b-[8px] border-r-[8px] border-t-[8px] border-b-transparent border-r-white border-t-transparent" />
                                {/* Border arrow for outline effect */}
                                <div className="absolute left-[-9px] top-3 h-0 w-0 border-b-[9px] border-r-[9px] border-t-[9px] border-b-transparent border-r-gray-200 border-t-transparent" />
                              </>
                            ) : null}
                          </>
                        )}
                      </div>

                      {/* Timestamp and Status */}
                      <div
                        className={`mt-1 flex items-center gap-2 ${
                          isStaff ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <span className="text-xs text-gray-500">{message.timestamp}</span>
                        {isStaff && (
                          <div className="text-xs text-gray-500">
                            {message.readStatus === '既読' ? (
                              <CheckCheck className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Reservation Info */}
                      {message.isReservationInfo && (
                        <div className="mt-3 flex flex-col items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="border-blue-200 bg-blue-100 text-blue-800"
                          >
                            予約が確定に変更されました
                          </Badge>
                          <div className="text-sm font-medium text-blue-700">
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
                <div className="flex max-w-[80%] gap-3">
                  <Avatar className="mt-1 h-8 w-8">
                    <AvatarImage src={customer?.avatar} alt={customer?.name} />
                    <AvatarFallback className="bg-gray-400 text-xs text-white">
                      {customer?.name?.[0] || 'G'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex space-x-1">
                      <div
                        className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                        style={{ animationDelay: '0ms' }}
                      ></div>
                      <div
                        className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                        style={{ animationDelay: '150ms' }}
                      ></div>
                      <div
                        className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                        style={{ animationDelay: '300ms' }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-white/80 p-4 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-end gap-3">
            {/* Message Input */}
            <div className="relative flex-1">
              <Textarea
                placeholder="メッセージを入力..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                className="max-h-[120px] min-h-[44px] resize-none border-gray-200 focus:border-emerald-300 focus:ring-emerald-200"
              />
            </div>

            {/* Send Button */}
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="h-11 bg-emerald-600 px-4 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
