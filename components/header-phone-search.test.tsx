/**
 * @design_doc   CST-02 管理画面上部メニューの顧客電話番号検索
 * @related_to   HeaderPhoneSearch
 * @known_issues None
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HeaderPhoneSearch } from './header-phone-search'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('@/contexts/store-context', () => ({
  useStore: () => ({ currentStore: { id: 'ikebukuro', slug: 'ikebukuro' } }),
}))

describe('HeaderPhoneSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ id: 'cust-1', name: '山田花子', phone: '+819012345678' }],
      })
    )
  })

  it('shows a matching customer popup for a registered phone number', async () => {
    render(<HeaderPhoneSearch />)

    fireEvent.change(screen.getByLabelText('顧客の電話番号'), {
      target: { value: '09012345678' },
    })
    fireEvent.submit(screen.getByRole('form', { name: '顧客電話番号検索' }))

    expect(await screen.findByText('山田花子')).toBeInTheDocument()
    expect(screen.getByText('090-1234-5678')).toBeInTheDocument()
  })

  it('opens new customer registration when the complete phone is unregistered', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      })
    )
    render(<HeaderPhoneSearch />)

    fireEvent.change(screen.getByLabelText('顧客の電話番号'), {
      target: { value: '09099998888' },
    })
    fireEvent.submit(screen.getByRole('form', { name: '顧客電話番号検索' }))

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        '/admin/customers/new?returnTo=detail&phone=09099998888&store=ikebukuro'
      )
    )
  })
})
