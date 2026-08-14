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
const switchStore = vi.fn()
let searchParams = new URLSearchParams()
const storeContextState = vi.hoisted(() => {
  const ikebukuroStore = {
    id: 'legacy-store-ikebukuro',
    slug: 'ikebukuro',
    name: '池袋店',
    displayName: '池袋店',
  }
  const shinjukuStore = {
    id: 'legacy-store-shinjuku',
    slug: 'shinjuku',
    name: '新宿店',
    displayName: '新宿店',
  }

  return {
    ikebukuroStore,
    shinjukuStore,
    currentStore: ikebukuroStore,
    availableStores: [ikebukuroStore, shinjukuStore],
  }
})

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, back }),
  useSearchParams: () => searchParams,
}))

vi.mock('@/contexts/store-context', () => ({
  useStore: () => ({
    currentStore: storeContextState.currentStore,
    availableStores: storeContextState.availableStores,
    switchStore,
  }),
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
    storeContextState.currentStore = storeContextState.ikebukuroStore
    storeContextState.availableStores = [
      storeContextState.ikebukuroStore,
      storeContextState.shinjukuStore,
    ]
    global.fetch = vi.fn()
  })

  it('creates a customer with only the persisted required fields and returns to reservation intake', async () => {
    searchParams = new URLSearchParams('returnTo=reservation&phone=09012345678&store=ikebukuro')
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
    expect(screen.getByText('池袋店')).toBeInTheDocument()
    expect(screen.getByText('090-1234-5678')).toBeInTheDocument()
    expect(screen.queryByLabelText(/電話番号/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/メールアドレス/)).not.toBeInTheDocument()
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: '登録' }))

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    expect(fetch).toHaveBeenCalledWith('/api/admin/customers?storeId=legacy-store-ikebukuro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: '予約 太郎',
        phone: '09012345678',
      }),
    })
    expect(push).toHaveBeenCalledWith(
      '/admin/reservation?customerId=customer%2Fcreated%201&store=ikebukuro'
    )
    expect(switchStore).toHaveBeenCalledWith('ikebukuro')
    expect(switchStore.mock.invocationCallOrder[0]).toBeLessThan(push.mock.invocationCallOrder[0])
  })

  it('keeps the full form for customer creation that did not start from a phone lookup', () => {
    render(<NewCustomerContent />)

    expect(screen.getByLabelText(/名前/)).toBeInTheDocument()
    expect(screen.getByLabelText(/電話番号/)).toBeInTheDocument()
    expect(screen.getByLabelText(/メールアドレス/)).toBeInTheDocument()
  })

  it('does not enter name-only mode for an incomplete phone query', () => {
    searchParams = new URLSearchParams('phone=090123&store=ikebukuro')

    render(<NewCustomerContent />)

    expect(screen.getByLabelText(/電話番号/)).toHaveValue('090123')
    expect(screen.getByLabelText(/メールアドレス/)).toBeInTheDocument()
    expect(screen.queryByText('電話番号（引継ぎ済み）')).not.toBeInTheDocument()
  })

  it('locks phone-intake registration to Ikebukuro even when another store is requested', () => {
    searchParams = new URLSearchParams('returnTo=reservation&phone=09012345678&store=shinjuku')

    render(<NewCustomerContent />)

    expect(screen.getByText('池袋店')).toBeInTheDocument()
    expect(screen.queryByText('新宿店')).not.toBeInTheDocument()
  })

  it('blocks phone-intake registration when Ikebukuro is outside the operator scope', () => {
    storeContextState.currentStore = storeContextState.shinjukuStore
    storeContextState.availableStores = [storeContextState.shinjukuStore]
    searchParams = new URLSearchParams('returnTo=reservation&phone=09012345678&store=ikebukuro')

    render(<NewCustomerContent />)

    expect(screen.getByRole('alert')).toHaveTextContent('池袋店の利用権限を確認できません')
    expect(screen.getByRole('button', { name: '登録' })).toBeDisabled()
  })

  it('describes the customer-detail destination accurately for lookup registration', () => {
    searchParams = new URLSearchParams('returnTo=detail&phone=09012345678&store=ikebukuro')

    render(<NewCustomerContent />)

    expect(screen.getByText(/登録すると顧客詳細へ進みます/)).toBeInTheDocument()
    expect(screen.queryByText(/池袋の予約作成へ戻ります/)).not.toBeInTheDocument()
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
