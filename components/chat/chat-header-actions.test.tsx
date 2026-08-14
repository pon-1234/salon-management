/**
 * @design_doc   Admin chat participant header action contracts
 * @related_to   CustomerHeader and CastHeader
 * @known_issues None
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CastHeader } from './cast-header'
import { CustomerHeader } from './customer-header'
import type { CastChatEntry, Customer } from '@/lib/types/chat'

const customer = {
  id: 'customer-1',
  name: '山田 太郎',
  phone: '+819012345678',
  lastMessage: '',
  lastMessageTime: '',
  hasUnread: false,
  unreadCount: 0,
  isOnline: false,
  memberType: 'regular',
} satisfies Customer

const cast = {
  id: 'cast-1',
  name: '池袋 花子',
  lastMessage: '',
  lastMessageTime: '',
  hasUnread: false,
  unreadCount: 0,
  isOnline: false,
  status: 'オフライン',
} satisfies CastChatEntry

describe('chat participant header actions', () => {
  it('calls the selected customer through the phone number returned by the API', () => {
    render(<CustomerHeader customer={customer} />)

    expect(screen.getByRole('link', { name: '山田 太郎へ電話' })).toHaveAttribute(
      'href',
      'tel:+819012345678'
    )
  })

  it('does not render a dead phone action for a cast without a phone field', () => {
    render(<CastHeader cast={cast} />)

    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.getByRole('link', { name: '池袋 花子の詳細' })).toHaveAttribute(
      'href',
      '/admin/cast/manage/cast-1'
    )
  })
})
