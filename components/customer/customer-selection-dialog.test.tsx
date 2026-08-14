/**
 * @design_doc   docs/LEGACY_GOLD_ADMIN_MIGRATION_INVENTORY.md customer lookup
 * @related_to   CustomerSelectionDialog; CustomerRepositoryImpl.search
 * @known_issues None
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CustomerSelectionDialog } from './customer-selection-dialog'

const getAll = vi.fn()
const search = vi.fn()
const searchByPhone = vi.fn()
const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('@/contexts/store-context', () => ({
  useStore: () => ({
    currentStore: { id: 'legacy-store-ikebukuro', slug: 'ikebukuro' },
  }),
}))

vi.mock('@/lib/customer/repository-impl', () => ({
  CustomerRepositoryImpl: class {
    getAll = getAll
    search = search
    searchByPhone = searchByPhone
  },
}))

const customer = {
  id: 'legacy-customer-member-1234',
  name: '[確認用] 旧実名顧客',
  nameKana: '旧実名顧客',
  phone: '09012345678',
  email: 'legacy@example.com',
  password: '',
  birthDate: new Date('1985-04-03T00:00:00.000Z'),
  age: 41,
  memberType: 'vip' as const,
  smsEnabled: false,
  emailNotificationEnabled: false,
  points: 3200,
  registrationDate: new Date('2020-05-06T00:00:00.000Z'),
  createdAt: new Date('2020-05-06T00:00:00.000Z'),
  updatedAt: new Date('2026-07-28T00:00:00.000Z'),
}

describe('CustomerSelectionDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAll.mockResolvedValue([])
    search.mockResolvedValue([customer])
    searchByPhone.mockResolvedValue([])
  })

  it('searches the server for a customer name that is not on the first page', async () => {
    render(<CustomerSelectionDialog open onOpenChange={vi.fn()} onSelectCustomer={vi.fn()} />)

    const input = await screen.findByPlaceholderText(
      '名前、電話番号、メールアドレス、会員番号で検索...'
    )
    fireEvent.change(input, { target: { value: '旧実名顧客' } })

    await waitFor(() => expect(search).toHaveBeenCalledWith('旧実名顧客'))
    expect(await screen.findByText('[確認用] 旧実名顧客')).toBeInTheDocument()
  })

  it('opens an exact phone match in customer details without asking for new-customer fields', async () => {
    searchByPhone.mockResolvedValueOnce([{ ...customer, id: 'legacy/customer 1234' }])

    render(<CustomerSelectionDialog open mode="lookup" onOpenChange={vi.fn()} />)

    fireEvent.change(
      await screen.findByPlaceholderText('名前、電話番号、メールアドレス、会員番号で検索...'),
      { target: { value: '090-1234-5678' } }
    )

    await waitFor(() => expect(searchByPhone).toHaveBeenCalledWith('090-1234-5678'))
    expect(await screen.findByText('[確認用] 旧実名顧客')).toBeInTheDocument()
    expect(screen.queryByLabelText('名前')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '新規顧客を登録' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /顧客詳細を開く/ }))

    expect(push).toHaveBeenCalledWith('/admin/customers/legacy%2Fcustomer%201234')
  })

  it('clears the prior search and customer selection every time it is reopened', async () => {
    getAll.mockResolvedValueOnce([customer])
    searchByPhone.mockResolvedValueOnce([customer])
    const onOpenChange = vi.fn()
    const { rerender } = render(
      <CustomerSelectionDialog open onOpenChange={onOpenChange} onSelectCustomer={vi.fn()} />
    )

    const input = await screen.findByPlaceholderText(
      '名前、電話番号、メールアドレス、会員番号で検索...'
    )
    fireEvent.change(input, { target: { value: '09012345678' } })
    await waitFor(() => expect(searchByPhone).toHaveBeenCalledWith('09012345678'))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /この顧客で予約を作成/ })).toBeEnabled()
    )

    rerender(
      <CustomerSelectionDialog
        open={false}
        onOpenChange={onOpenChange}
        onSelectCustomer={vi.fn()}
      />
    )
    rerender(
      <CustomerSelectionDialog open onOpenChange={onOpenChange} onSelectCustomer={vi.fn()} />
    )

    expect(
      await screen.findByPlaceholderText('名前、電話番号、メールアドレス、会員番号で検索...')
    ).toHaveValue('')
    expect(screen.getByRole('button', { name: /この顧客で予約を作成/ })).toBeDisabled()
  })

  it('shows a retryable error instead of substituting mock customers when loading fails', async () => {
    getAll.mockRejectedValueOnce(new Error('network unavailable')).mockResolvedValueOnce([])

    render(<CustomerSelectionDialog open onOpenChange={vi.fn()} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('顧客データを取得できませんでした')
    expect(screen.queryByText(/モックデータ/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '新規顧客を登録' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '再試行' }))
    await waitFor(() => expect(getAll).toHaveBeenCalledTimes(2))
  })

  it('carries a directly entered phone into new registration and returns to reservation creation', async () => {
    searchByPhone.mockResolvedValueOnce([])

    render(<CustomerSelectionDialog open onOpenChange={vi.fn()} />)

    fireEvent.change(
      await screen.findByPlaceholderText('名前、電話番号、メールアドレス、会員番号で検索...'),
      { target: { value: '090-1234-5678' } }
    )
    await waitFor(() => expect(searchByPhone).toHaveBeenCalledWith('090-1234-5678'))

    fireEvent.click(screen.getByRole('button', { name: '新規顧客を登録' }))

    expect(push).toHaveBeenCalledWith(
      '/admin/customers/new?returnTo=reservation&phone=09012345678&store=ikebukuro'
    )
  })
})
