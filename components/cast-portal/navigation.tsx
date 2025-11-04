'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavigationItem {
  href: string
  label: string
}

export function CastPortalNavigation({ items }: { items: NavigationItem[] }) {
  const pathname = usePathname()

  return (
    <nav className="border-b bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 overflow-x-auto px-4">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative inline-flex items-center rounded-md px-4 py-3 text-sm font-medium transition-colors',
                'text-muted-foreground hover:text-foreground',
                isActive && 'bg-primary/10 text-primary'
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
