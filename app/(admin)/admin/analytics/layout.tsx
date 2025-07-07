import { Header } from '@/components/header'
import { AnalyticsLayout } from '@/components/analytics/layout'
import { Users } from 'lucide-react'

export default function AnalyticsRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <AnalyticsLayout
        navigationItems={[
          // existing navigation items...
          {
            name: '就業データ',
            href: '/analytics/staff-attendance',
            icon: Users,
          },
          // ...rest of navigation items
        ]}
      />
      <div className="flex-1 p-8">{children}</div>
    </div>
  )
}
