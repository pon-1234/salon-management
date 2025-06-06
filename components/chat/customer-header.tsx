import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserCircle, Archive, Phone, Video, MoreVertical, Crown } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { Customer } from "@/lib/types/chat"

interface CustomerHeaderProps {
  customer?: Customer
}

export function CustomerHeader({ customer }: CustomerHeaderProps) {
  if (!customer) {
    return (
      <div className="h-[70px] border-b bg-white/80 backdrop-blur-sm px-6 flex items-center">
        <div className="text-gray-500 text-sm">顧客が選択されていません</div>
      </div>
    )
  }

  return (
    <div className="h-[70px] border-b bg-white/80 backdrop-blur-sm px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Customer Avatar and Info */}
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={customer.avatar} alt={customer.name} />
            <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-medium">
              {customer.name[0]}
            </AvatarFallback>
          </Avatar>
          {customer.isOnline && (
            <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 border-2 border-white rounded-full"></div>
          )}
        </div>
        
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">{customer.name} 様</h2>
            {customer.memberType === "vip" && (
              <Crown className="h-4 w-4 text-amber-500" />
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {customer.isOnline ? (
              <span className="text-green-600 font-medium">オンライン</span>
            ) : (
              <span>最終ログイン: {customer.lastSeen}</span>
            )}
            {customer.hasUnread && customer.unreadCount > 0 && (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-xs">
                未読 {customer.unreadCount}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="text-gray-600 hover:text-emerald-600 hover:bg-emerald-50">
          <Phone className="h-4 w-4" />
        </Button>
        
        <Button variant="ghost" size="sm" className="text-gray-600 hover:text-emerald-600 hover:bg-emerald-50">
          <Video className="h-4 w-4" />
        </Button>
        
        <Link href={`/customers/${customer.id}`}>
          <Button variant="ghost" size="sm" className="text-gray-600 hover:text-emerald-600 hover:bg-emerald-50">
            <UserCircle className="h-4 w-4 mr-2" />
            詳細
          </Button>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-700">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem className="text-gray-600">
              <Archive className="h-4 w-4 mr-2" />
              メッセージを削除
            </DropdownMenuItem>
            <DropdownMenuItem className="text-gray-600">
              <UserCircle className="h-4 w-4 mr-2" />
              プロフィールを表示
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
