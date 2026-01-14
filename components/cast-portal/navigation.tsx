'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Home, CalendarCheck, Wallet2, MessageCircle, Link2, BarChart3, Camera } from 'lucide-react'

export interface NavigationItem {
  href: string
  label: string
  icon: 'home' | 'calendar' | 'wallet' | 'chat' | 'link' | 'chart' | 'camera'
}

export interface CastPortalNavigationProps {
  items: NavigationItem[]
}

export function CastPortalNavigation({ items }: CastPortalNavigationProps) {
  const pathname = usePathname()

  return (
    <nav className="border-b bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-stretch gap-2 overflow-x-auto px-4">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative inline-flex flex-col items-center justify-center rounded-md px-3 py-2 text-xs font-medium transition-colors',
                'text-muted-foreground hover:text-foreground min-w-[72px]',
                isActive && 'bg-primary/10 text-primary'
              )}
            >
              <span className="flex h-5 w-5 items-center justify-center">
                {item.icon === 'home' && <Home className="h-4 w-4" />}
                {item.icon === 'calendar' && <CalendarCheck className="h-4 w-4" />}
                {item.icon === 'wallet' && <Wallet2 className="h-4 w-4" />}
                {item.icon === 'chat' && <MessageCircle className="h-4 w-4" />}
                {item.icon === 'link' && <Link2 className="h-4 w-4" />}
                {item.icon === 'chart' && <BarChart3 className="h-4 w-4" />}
                {item.icon === 'camera' && <Camera className="h-4 w-4" />}
              </span>
              <span className="mt-1 text-[11px]">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
