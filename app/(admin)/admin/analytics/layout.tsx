import { AnalyticsLayout } from '@/components/analytics/layout'

export default function AnalyticsRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <AnalyticsLayout />
      <div className="flex-1 p-8">{children}</div>
    </div>
  )
}
