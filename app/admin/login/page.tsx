/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md C-10
 * @related_to   AdminLoginClient: administrator authentication form
 * @known_issues None
 */
import type { Metadata } from 'next'
import { AdminLoginClient } from './admin-login-client'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: '管理画面ログイン',
  description: 'サロン管理者向けログイン',
}

export default function AdminLoginPage() {
  return <AdminLoginClient />
}
