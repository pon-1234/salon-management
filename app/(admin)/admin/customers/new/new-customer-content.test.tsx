/**
 * @design_doc   Administrative customer registration and reservation return flow
 * @related_to   NewCustomerContent; POST /api/admin/customers
 * @known_issues None
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { NewCustomerContent } from './new-customer-content'

const push = vi.fn()
const back = vi.fn()
let searchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, back }),
  useSearchParams: () => searchParams,
}))

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText(/名前/), {
    target: { value: '予約 太郎' },
  })
  fireEvent.change(screen.getByLabelText(/電話番号/), {
    target: { value: '090-1234-5678' },
  })
}

describe('NewCustomerContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    searchParams = new URLSearchParams()
    global.fetch = vi.fn()
  })

  it('creates a customer with only the persisted required fields and returns to reservation intake', async () => {
    searchParams = new URLSearchParams('returnTo=reservation&phone=09012345678')
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        customer: {
          id: 'customer/created 1',
          name: '予約 太郎',
          phone: '09012345678',
        },
      }),
    } as Response)

    render(<NewCustomerContent />)

    fireEvent.change(screen.getByLabelText(/名前/), {
      target: { value: '予約 太郎' },
    })
    expect(screen.getByLabelText(/電話番号/)).toHaveValue('09012345678')
    fireEvent.click(screen.getByRole('button', { name: '登録' }))

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    expect(fetch).toHaveBeenCalledWith('/api/admin/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: '予約 太郎',
        phone: '09012345678',
      }),
    })
    expect(push).toHaveBeenCalledWith('/admin/reservation?customerId=customer%2Fcreated%201')
  })

  it('shows the server error inline instead of acting like registration succeeded', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'この電話番号は既に登録されています' }),
    } as Response)

    render(<NewCustomerContent />)
    fillRequiredFields()
    fireEvent.click(screen.getByRole('button', { name: '登録' }))

    expect(await screen.findByRole('alert', { name: '顧客登録エラー' })).toHaveTextContent(
      'この電話番号は既に登録されています'
    )
    expect(push).not.toHaveBeenCalled()
  })
})
