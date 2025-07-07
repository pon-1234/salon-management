import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { UserCircle, Phone, Crown } from 'lucide-react'
import Link from 'next/link'
import { Customer } from '@/lib/types/chat'

interface CustomerHeaderProps {
  customer?: Customer
}

export function CustomerHeader({ customer }: CustomerHeaderProps) {
  if (!customer) {
    return (
      <div className="flex h-[70px] items-center border-b bg-white/80 px-6 backdrop-blur-sm">
        <div className="text-sm text-gray-500">顧客が選択されていません</div>
      </div>
    )
  }

  return (
    <div className="flex h-[70px] items-center justify-between border-b bg-white/80 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        {/* Customer Avatar and Info */}
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={customer.avatar} alt={customer.name} />
            <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-emerald-600 font-medium text-white">
              {customer.name[0]}
            </AvatarFallback>
          </Avatar>
          {customer.isOnline && (
            <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-green-500"></div>
          )}
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">{customer.name} 様</h2>
            {customer.memberType === 'vip' && <Crown className="h-4 w-4 text-amber-500" />}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {customer.isOnline ? (
              <span className="font-medium text-green-600">オンライン</span>
            ) : (
              <span>最終ログイン: {customer.lastSeen}</span>
            )}
            {customer.hasUnread && customer.unreadCount > 0 && (
              <Badge variant="secondary" className="bg-emerald-100 text-xs text-emerald-700">
                未読 {customer.unreadCount}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-600 hover:bg-emerald-50 hover:text-emerald-600"
        >
          <Phone className="h-4 w-4" />
        </Button>

        <Link href={`/customers/${customer.id}`}>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:bg-emerald-50 hover:text-emerald-600"
          >
            <UserCircle className="mr-2 h-4 w-4" />
            詳細
          </Button>
        </Link>
      </div>
    </div>
  )
}
