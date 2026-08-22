import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function DailySalesPage() {
  redirect('/admin/analytics/daily-report')
}
