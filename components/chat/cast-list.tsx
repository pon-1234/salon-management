'use client'

/**
 * @design_doc   Store-scoped administrative cast chat navigation
 * @related_to   /api/chat/casts and ChatWindow
 * @known_issues Presence remains offline until a real presence source is introduced
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import type { CastChatEntry } from '@/lib/types/chat'
import { useStore } from '@/contexts/store-context'

interface CastListProps {
  selectedCastId?: string
  onSelectCast: (cast: CastChatEntry | null) => void
}

export function CastList({ selectedCastId, onSelectCast }: CastListProps) {
  const { currentStore } = useStore()
  const [casts, setCasts] = useState<CastChatEntry[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchCasts = useCallback(
    async (signal?: AbortSignal) => {
      setCasts([])
      setLoading(true)
      try {
        const params = new URLSearchParams({ storeId: currentStore.id })
        const response = await fetch(`/api/chat/casts?${params.toString()}`, {
          credentials: 'include',
          cache: 'no-store',
          signal,
        })
        if (!response.ok) {
          throw new Error(`Failed to fetch casts: ${response.status}`)
        }
        const payload = await response.json()
        const data = Array.isArray(payload?.data) ? payload.data : payload
        setCasts(Array.isArray(data) ? data : [])
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
        console.error('Failed to load cast chat list:', error)
        toast({
          title: 'エラー',
          description: 'キャスト一覧の取得に失敗しました',
          variant: 'destructive',
        })
      } finally {
        if (!signal?.aborted) {
          setLoading(false)
        }
      }
    },
    [currentStore.id]
  )

  useEffect(() => {
    const controller = new AbortController()
    void fetchCasts(controller.signal)
    return () => controller.abort()
  }, [fetchCasts])

  useEffect(() => {
    const handleMessagesRead = (event: Event) => {
      const customEvent = event as CustomEvent<{ castId?: string }>
      const castId = customEvent.detail?.castId
      if (!castId) return

      setCasts((prev) =>
        prev.map((cast) =>
          cast.id === castId ? { ...cast, hasUnread: false, unreadCount: 0 } : cast
        )
      )
    }

    window.addEventListener('chat:messagesRead', handleMessagesRead as EventListener)
    return () =>
      window.removeEventListener('chat:messagesRead', handleMessagesRead as EventListener)
  }, [])

  const filteredCasts = useMemo(() => {
    return casts.filter((cast) => cast.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [casts, searchQuery])

  return (
    <div className="flex h-full min-h-0 w-[280px] flex-col overflow-hidden border-r bg-gradient-to-b from-white to-gray-50/50 md:w-[320px]">
      <div className="shrink-0 border-b bg-white/80 p-3 backdrop-blur-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">キャストチャット</h2>
          <Badge variant="secondary" className="text-xs">
            {filteredCasts.length}
          </Badge>
        </div>
        <div className="relative">
          <Input
            placeholder="キャスト名を検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-gray-200 bg-gray-50 pl-10 transition-colors focus:bg-white"
          />
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : (
          <div className="p-1.5">
            {filteredCasts.map((cast) => (
              <button
                key={cast.id}
                className={`mb-1 w-full rounded-lg px-2 py-2 text-left transition-all duration-200 hover:shadow-sm ${
                  selectedCastId === cast.id
                    ? 'border border-emerald-200 bg-emerald-50 shadow-sm'
                    : 'hover:bg-white'
                }`}
                onClick={() => onSelectCast(cast)}
              >
                <div className="flex items-start gap-2">
                  <div className="relative">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={cast.avatar} alt={cast.name} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-400 to-purple-600 text-xs font-medium text-white">
                        {cast.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    {cast.isOnline && (
                      <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-green-500"></div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="truncate font-medium text-gray-900">{cast.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{cast.lastMessageTime}</span>
                        {cast.hasUnread && cast.unreadCount > 0 && (
                          <Badge className="h-5 min-w-[20px] bg-emerald-600 px-1.5 text-xs text-white hover:bg-emerald-700">
                            {cast.unreadCount > 99 ? '99+' : cast.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="line-clamp-1 text-sm leading-relaxed text-gray-600">
                      {cast.lastMessage || 'まだメッセージはありません'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
