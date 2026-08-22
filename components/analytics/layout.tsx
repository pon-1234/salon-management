'use client'

/**
 * @design_doc   ui-improvement-instructions.md U-6 admin analytics navigation
 * @related_to   app/(admin)/admin/analytics/layout.tsx: analytics route shell
 * @known_issues Sidebar structure remains otherwise unchanged
 */
import { CalendarDays, BarChart3, Clock, Users } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navigation = [
  {
    name: '当日売上',
    href: '/admin/analytics/daily-report',
    icon: CalendarDays,
  },
  {
    name: '精算',
    href: '/admin/analytics/settlement-processing',
    icon: BarChart3,
  },
  {
    name: '月次レポート',
    href: '/admin/analytics/monthly-sales',
    icon: BarChart3,
  },
  {
    name: '年間レポート',
    href: '/admin/analytics/annual-sales',
    icon: CalendarDays,
  },
  {
    name: 'コース別集計',
    href: '/admin/analytics/course-sales',
    icon: BarChart3,
  },
  {
    name: 'オプション別集計',
    href: '/admin/analytics/option-sales',
    icon: BarChart3,
  },
  {
    name: '営業媒体別集計',
    href: '/admin/analytics/marketing-channels',
    icon: BarChart3,
  },
  {
    name: 'エリア別集計',
    href: '/admin/analytics/area-sales',
    icon: BarChart3,
  },
  {
    name: '区別集計',
    href: '/admin/analytics/district-sales',
    icon: BarChart3,
  },
  {
    name: '時間別集計',
    href: '/admin/analytics/hourly-sales',
    icon: Clock,
  },
  {
    name: 'キャスト実績',
    href: '/admin/analytics/cast-performance',
    icon: Users,
  },
  {
    name: '就業データ',
    href: '/admin/analytics/staff-attendance',
    icon: Users,
  },
  {
    name: '決済状況',
    href: '/admin/analytics/payment-status',
    icon: BarChart3,
  },
]

export function AnalyticsLayout() {
  const pathname = usePathname()

  return (
    <nav className="h-full w-64 shrink-0 overflow-y-auto border-r bg-muted/40">
      <ul className="space-y-2 p-4">
        {navigation.map((item) => (
          <li key={item.name}>
            <Link
              href={item.href}
              aria-current={pathname === item.href ? 'page' : undefined}
              className={cn(
                'flex items-center rounded p-2 hover:bg-gray-200',
                pathname === item.href && 'bg-gray-900 text-white hover:bg-gray-900'
              )}
            >
              <item.icon className="mr-2 h-5 w-5" />
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
