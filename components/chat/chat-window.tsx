'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Send, Check, CheckCheck, ImagePlus } from 'lucide-react'
import { Message } from '@/lib/types/chat'
import { toast } from '@/hooks/use-toast'
import { useChatAttachments } from '@/hooks/use-chat-attachments'
import { ChatAttachmentPreviewList } from '@/components/chat/chat-attachment-previews'
import { ChatAttachmentGallery } from '@/components/chat/chat-attachment-gallery'

interface ChatWindowProps {
  participantType: 'customer' | 'cast'
  participantId?: string
}

export function ChatWindow({ participantType, participantId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [participant, setParticipant] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    drafts: attachmentDrafts,
    addFiles,
    removeAttachment,
    reset,
    readyAttachments,
    hasUploading,
  } = useChatAttachments(5)

  const markMessagesAsRead = useCallback(
    async (messageList: Message[]) => {
      if (!participantId) return messageList

      const targetSender = participantType === 'customer' ? 'customer' : 'cast'
      const unreadMessages = messageList.filter(
        (message) => message.sender === targetSender && message.readStatus === '未読'
      )

      if (unreadMessages.length === 0) return messageList

      try {
        await Promise.all(
          unreadMessages.map((message) =>
            fetch('/api/chat', {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ id: message.id, readStatus: '既読' }),
            })
          )
        )

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('chat:messagesRead', {
              detail:
                participantType === 'customer'
                  ? { customerId: participantId }
                  : { castId: participantId },
            })
          )
        }

        return messageList.map((message) =>
          unreadMessages.some((unread) => unread.id === message.id)
            ? { ...message, readStatus: '既読' as const }
            : message
        )
      } catch (error) {
        console.error('Error marking messages as read:', error)
        return messageList
      }
    },
    [participantId, participantType]
  )

  const fetchMessages = useCallback(async () => {
    if (!participantId) return

    setLoading(true)
    try {
      const queryParam =
        participantType === 'customer'
          ? `customerId=${participantId}`
          : `castId=${participantId}`
      const response = await fetch(`/api/chat?${queryParam}`, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to fetch messages')

      const data = await response.json()
      const initialMessages = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
      const normalizedMessages = initialMessages.map((message) => ({
        ...message,
        attachments: Array.isArray(message.attachments) ? message.attachments : [],
      }))
      const updatedMessages = await markMessagesAsRead(normalizedMessages)
      setMessages(updatedMessages)
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
  }, [participantId, participantType, markMessagesAsRead])

  const fetchParticipant = useCallback(async () => {
    if (!participantId) return

    try {
      const endpoint =
        participantType === 'customer'
          ? `/api/chat/customers?id=${participantId}`
          : `/api/chat/casts?id=${participantId}`
      const response = await fetch(endpoint, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to fetch participant')

      const data = await response.json()
      setParticipant(data?.data ?? data)
    } catch (error) {
      console.error('Error fetching participant:', error)
    }
  }, [participantId, participantType])

  useEffect(() => {
    if (participantId) {
      fetchMessages()
      fetchParticipant()
    } else {
      setMessages([])
      setParticipant(null)
    }
  }, [participantId, fetchMessages, fetchParticipant])

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async () => {
    const trimmed = newMessage.trim()
    if (!participantId || (trimmed.length === 0 && readyAttachments.length === 0)) return

    if (hasUploading) {
      toast({
        title: 'アップロード中です',
        description: '画像のアップロード完了を待ってから送信してください。',
        variant: 'default',
      })
      return
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: participantType === 'customer' ? participantId : undefined,
          castId: participantType === 'cast' ? participantId : undefined,
          sender: 'staff',
          content: trimmed,
          attachments: readyAttachments,
        }),
      })

      if (!response.ok) throw new Error('Failed to send message')

      const payload = await response.json()
      const createdMessage = (payload?.data ?? payload) as Message

      setMessages((prev) => [
        ...prev,
        {
          ...createdMessage,
          attachments: Array.isArray(createdMessage.attachments) ? createdMessage.attachments : [],
        },
      ])
      setNewMessage('')
      reset()
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: 'エラー',
        description: 'メッセージの送信に失敗しました',
        variant: 'destructive',
      })
    }
  }

  if (!participantId) {
    const label = participantType === 'customer' ? '顧客' : 'キャスト'
    return (
      <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="mb-4 text-gray-400">
            <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <p className="text-lg font-medium text-gray-600">{label}を選択してください</p>
          <p className="mt-2 text-sm text-gray-500">
            左側のリストから{label}を選択して
            <br />
            チャットを開始してください
          </p>
        </div>
      </div>
    )
  }

  const participantInitial = participant?.name?.[0] || 'G'
  const canSend = (newMessage.trim().length > 0 || readyAttachments.length > 0) && !hasUploading

  return (
    <div className="flex flex-1 flex-col bg-gradient-to-b from-white to-gray-50/30">
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
              const bubbleLabel =
                participantType === 'customer'
                  ? { avatar: participant?.avatar, fallback: participantInitial }
                  : { avatar: participant?.avatar, fallback: participantInitial }
              const attachments = Array.isArray(message.attachments) ? message.attachments : []
              const textContent = message.content?.trim() ?? ''

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
                    {showAvatar && !message.isReservationInfo && (
                      <Avatar className="mt-1 h-8 w-8">
                        {isStaff ? (
                          <AvatarFallback className="bg-emerald-600 text-xs text-white">
                            ス
                          </AvatarFallback>
                        ) : (
                          <>
                            <AvatarImage src={bubbleLabel.avatar} alt={participant?.name} />
                            <AvatarFallback className="bg-gray-400 text-xs text-white">
                              {bubbleLabel.fallback}
                            </AvatarFallback>
                          </>
                        )}
                      </Avatar>
                    )}

                    {!showAvatar && !message.isReservationInfo && <div className="w-8" />}

                    <div className="flex-1">
                      <div
                        className={`relative whitespace-pre-wrap rounded-2xl px-4 py-3 shadow-sm ${
                          message.isReservationInfo
                            ? 'border border-blue-200 bg-blue-50 text-center text-blue-800'
                            : isStaff
                              ? 'bg-emerald-500 text-white'
                              : participantType === 'cast'
                                ? 'border border-purple-200 bg-purple-50'
                                : 'border border-gray-200 bg-white'
                        }`}
                      >
                        {textContent ? (
                          textContent
                        ) : attachments.length > 0 ? (
                          <span className="text-xs italic opacity-75">画像を送信しました</span>
                        ) : null}
                        <ChatAttachmentGallery attachments={attachments} align={isStaff ? 'right' : 'left'} />
                        <div className="mt-2 flex items-center justify-end gap-1 text-xs">
                          <span className={`text-gray-400 ${isStaff ? 'text-emerald-50/80' : ''}`}>
                            {new Date(message.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isStaff && (
                            message.readStatus === '既読' ? (
                              <CheckCheck className="h-3 w-3 text-emerald-100" />
                            ) : (
                              <Check className="h-3 w-3 text-emerald-100" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {messages.length === 0 && (
              <div className="py-10 text-center text-sm text-gray-500">
                まだメッセージはありません。
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <div className="border-t bg-white/80 p-4 backdrop-blur-sm">
        <div className="flex flex-col gap-3">
          <Textarea
            placeholder={`${participantType === 'customer' ? '顧客' : 'キャスト'}へメッセージを入力... (⌘/Ctrl + Enter で送信)`}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onFocus={() => setIsTyping(true)}
            onBlur={() => setIsTyping(false)}
            className="min-h-[60px] flex-1 resize-none"
          />
          <ChatAttachmentPreviewList attachments={attachmentDrafts} onRemove={removeAttachment} />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={(event) => {
                  const { files } = event.target
                  if (files?.length) {
                    void addFiles(files)
                    event.target.value = ''
                  }
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-emerald-700"
                onClick={() => fileInputRef.current?.click()}
                disabled={attachmentDrafts.length >= 5}
              >
                <ImagePlus className="mr-2 h-4 w-4" />
                画像を添付
              </Button>
              <span>
                {attachmentDrafts.length}/5 件
              </span>
            </div>
            <div className="flex items-center gap-3">
              {isTyping && <div className="text-xs text-gray-400">入力中...</div>}
              <Button onClick={handleSendMessage} disabled={!canSend}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
