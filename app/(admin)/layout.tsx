/**
 * @design_doc   ui-improvement-instructions.md U-12 metadata
 * @related_to   AdminLayoutClient: authenticated admin shell
 * @known_issues Client pages under admin inherit this template until page split work
 */
import type { Metadata } from 'next'
import { ReactNode } from 'react'
import { AdminLayoutClient } from './admin-layout-client'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: {
    default: '管理画面',
    template: '%s | 管理画面',
  },
  description: 'サロン運営の予約、顧客、キャスト、分析、設定を管理します。',
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>
}
