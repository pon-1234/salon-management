import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { User, PhoneCall } from 'lucide-react'
import type { CastChatEntry } from '@/lib/types/chat'

interface CastHeaderProps {
  cast?: CastChatEntry
}

export function CastHeader({ cast }: CastHeaderProps) {
  if (!cast) {
    return (
      <div className="flex h-[70px] items-center border-b bg-white/80 px-6 backdrop-blur-sm">
        <div className="text-sm text-gray-500">キャストが選択されていません</div>
      </div>
    )
  }

  return (
    <div className="flex h-[70px] items-center justify-between border-b bg-white/80 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={cast.avatar} alt={cast.name} />
            <AvatarFallback className="bg-gradient-to-br from-purple-400 to-purple-600 font-medium text-white">
              {cast.name[0]}
            </AvatarFallback>
          </Avatar>
          {cast.isOnline && (
            <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-green-500"></div>
          )}
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">{cast.name}</h2>
            {cast.status !== 'オフライン' && (
              <Badge variant="outline" className="text-xs text-emerald-600">
                {cast.status}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{cast.lastMessageTime}</span>
            {cast.hasUnread && cast.unreadCount > 0 && (
              <Badge variant="secondary" className="bg-emerald-100 text-xs text-emerald-700">
                未読 {cast.unreadCount}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="text-gray-600 hover:bg-purple-50 hover:text-purple-600">
          <PhoneCall className="h-4 w-4" />
        </Button>
        <Link href={`/admin/cast/manage/${cast.id}`}>
          <Button variant="ghost" size="sm" className="text-gray-600 hover:bg-purple-50 hover:text-purple-600">
            <User className="mr-2 h-4 w-4" />
            詳細
          </Button>
        </Link>
      </div>
    </div>
  )
}
