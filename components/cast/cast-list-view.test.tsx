/**
 * @design_doc   Client operational review: cast list actions must be real navigation
 * @related_to   CastListView and CastManagePage tab deep links
 * @known_issues None
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { Cast } from '@/lib/cast/types'

import { CastListView } from './cast-list-view'

const cast = {
  id: 'cast-1',
  name: '池袋 花子',
  nameKana: 'イケブクロ ハナコ',
  age: 25,
  height: 160,
  bust: 'C85',
  waist: 58,
  hip: 86,
  type: 'レギュラー',
  image: '/cast.jpg',
  workStatus: '出勤',
} as Cast

describe('CastListView', () => {
  it('provides real deep links for financial operations and does not render inert contact controls', () => {
    render(<CastListView casts={[cast]} view="list" />)

    expect(screen.getByRole('link', { name: '売上管理' })).toHaveAttribute(
      'href',
      '/admin/cast/manage/cast-1?tab=sales'
    )
    expect(screen.getByRole('link', { name: '精算' })).toHaveAttribute(
      'href',
      '/admin/cast/manage/cast-1?tab=settlement'
    )
    expect(screen.queryByText('入金処理 (今月) (先月)')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '電話をかける' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '業務連絡' })).not.toBeInTheDocument()
  })
})
