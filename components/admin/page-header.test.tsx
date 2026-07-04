/**
 * @design_doc   ui-improvement-instructions.md U-6 admin page header
 * @related_to   PageHeader: shared title and back-link affordance for admin pages
 * @known_issues Coverage focuses on structure; visual spacing is verified in admin pages
 */
import { render, screen } from '@testing-library/react'
import { ArrowLeft, Settings } from 'lucide-react'
import { describe, expect, it } from 'vitest'

import { Button } from '@/components/ui/button'
import { PageHeader } from './page-header'

describe('PageHeader', () => {
  it('renders a consistent title, description, back link, icon, and actions', () => {
    render(
      <PageHeader
        title="店舗情報設定"
        description="店舗の基本情報を管理します。"
        backHref="/admin/settings"
        backLabel="設定一覧へ戻る"
        icon={Settings}
        actions={<Button>保存</Button>}
      />
    )

    expect(screen.getByRole('heading', { name: '店舗情報設定' })).toBeInTheDocument()
    expect(screen.getByText('店舗の基本情報を管理します。')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '設定一覧へ戻る' })).toHaveAttribute(
      'href',
      '/admin/settings'
    )
    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument()
  })

  it('supports an explicit back icon label without visible back text', () => {
    render(<PageHeader title="指名料設定" backHref="/admin/settings" backIcon={ArrowLeft} />)

    expect(screen.getByRole('heading', { name: '指名料設定' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '前のページへ戻る' })).toHaveAttribute(
      'href',
      '/admin/settings'
    )
  })
})
