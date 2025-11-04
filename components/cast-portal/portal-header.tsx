'use client'

import { useTransition } from 'react'
import { signOut } from 'next-auth/react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CastPortalHeaderProps {
  displayName: string
  storeId?: string
  email?: string
}

export function CastPortalHeader({ displayName, storeId, email }: CastPortalHeaderProps) {
  const initials = displayName?.trim()?.[0]?.toUpperCase() ?? 'C'
  const [isPending, startTransition] = useTransition()

  const handleSignOut = () => {
    startTransition(() => {
      void signOut({ callbackUrl: '/cast/login' })
    })
  }

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            キャストマイページ
          </p>
          <h1 className="text-lg font-semibold text-foreground">
            {displayName}
            <span className="ml-1 text-sm font-normal text-muted-foreground">さん</span>
          </h1>
          {storeId ? <p className="text-xs text-muted-foreground">ID: {storeId}</p> : null}
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right text-sm sm:block">
            {email ? <p className="text-muted-foreground">{email}</p> : null}
            <p className="text-xs text-emerald-600">オンライン</p>
          </div>
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className={cn(isPending && 'pointer-events-none opacity-70')}
          >
            ログアウト
          </Button>
        </div>
      </div>
    </header>
  )
}
