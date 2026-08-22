/**
 * @design_doc   docs/LEGACY_GOLD_ADMIN_MIGRATION_INVENTORY.md customer lookup
 * @related_to   CustomerSelectionDialog; CustomerRepositoryImpl.search
 * @known_issues None
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CustomerSelectionDialog } from './customer-selection-dialog'

const getAll = vi.fn()
const search = vi.fn()
const searchByPhone = vi.fn()
const push = vi.fn()
const authState = vi.hoisted(() => ({
  permissions: ['customer:read', 'customer:create', 'reservation:create'],
}))
const storeState = vi.hoisted(() => ({
  currentStore: { id: 'legacy-store-ikebukuro', slug: 'ikebukuro' },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { role: 'admin', permissions: authState.permissions } },
    status: 'authenticated',
  }),
}))

vi.mock('@/contexts/store-context', () => ({
  useStore: () => ({
    currentStore: storeState.currentStore,
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
  phone: '+819012345678',
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
    authState.permissions = ['customer:read', 'customer:create', 'reservation:create']
    storeState.currentStore = { id: 'legacy-store-ikebukuro', slug: 'ikebukuro' }
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
    expect(screen.getByText('090-1234-5678')).toBeInTheDocument()
  })

  it('uses general search for a partial phone instead of the exact identity endpoint', async () => {
    render(<CustomerSelectionDialog open onOpenChange={vi.fn()} onSelectCustomer={vi.fn()} />)

    fireEvent.change(
      await screen.findByPlaceholderText('名前、電話番号、メールアドレス、会員番号で検索...'),
      { target: { value: '090123456' } }
    )

    await waitFor(() => expect(search).toHaveBeenCalledWith('090123456'))
    expect(searchByPhone).not.toHaveBeenCalled()
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

  it('opens customer details when the customer card is clicked in lookup mode', async () => {
    getAll.mockResolvedValueOnce([customer])

    render(<CustomerSelectionDialog open mode="lookup" onOpenChange={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: /\[確認用\] 旧実名顧客/ }))

    expect(push).toHaveBeenCalledWith('/admin/customers/legacy-customer-member-1234')
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

  it('discards the old customer list and reloads after the operator changes stores', async () => {
    const otherStoreCustomer = {
      ...customer,
      id: 'other-store-customer',
      name: '[確認用] 別店舗顧客',
    }
    getAll.mockResolvedValueOnce([customer]).mockResolvedValueOnce([otherStoreCustomer])

    const { rerender } = render(
      <CustomerSelectionDialog open onOpenChange={vi.fn()} onSelectCustomer={vi.fn()} />
    )

    expect(await screen.findByText('[確認用] 旧実名顧客')).toBeInTheDocument()

    storeState.currentStore = { id: 'other-store', slug: 'other-store' }
    rerender(<CustomerSelectionDialog open onOpenChange={vi.fn()} onSelectCustomer={vi.fn()} />)

    await waitFor(() => expect(getAll).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('[確認用] 別店舗顧客')).toBeInTheDocument()
    expect(screen.queryByText('[確認用] 旧実名顧客')).not.toBeInTheDocument()
  })

  it('shows a retryable error instead of substituting mock customers when loading fails', async () => {
    getAll.mockRejectedValueOnce(new Error('network unavailable')).mockResolvedValueOnce([])

    render(<CustomerSelectionDialog open onOpenChange={vi.fn()} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('顧客データを取得できませんでした')
    expect(screen.queryAllByText('検索中です…')).toHaveLength(0)
    expect(screen.queryByText('データを読み込めていません')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'タイムラインを確認する' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'この顧客で予約を作成' })).not.toBeInTheDocument()
    expect(screen.queryByText(/モックデータ/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '新規顧客を登録' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '再試行' }))
    await waitFor(() => expect(getAll).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryAllByText('検索中です…')).toHaveLength(0))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows only a retryable error when server search fails and retries the same query', async () => {
    getAll.mockResolvedValueOnce([customer])
    search.mockRejectedValueOnce(new Error('search unavailable')).mockResolvedValueOnce([customer])

    render(<CustomerSelectionDialog open onOpenChange={vi.fn()} />)

    fireEvent.change(
      await screen.findByPlaceholderText('名前、電話番号、メールアドレス、会員番号で検索...'),
      { target: { value: '旧実名顧客' } }
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('顧客検索に失敗しました')
    expect(screen.queryAllByText('検索中です…')).toHaveLength(0)
    expect(screen.queryByText('[確認用] 旧実名顧客')).not.toBeInTheDocument()
    expect(screen.queryByText('検索条件に一致する顧客が見つかりません')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'タイムラインを確認する' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '新規顧客を登録' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '再試行' }))

    await waitFor(() => expect(search).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('[確認用] 旧実名顧客')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
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

  it('offers new registration only after an exact phone search finishes with no match', async () => {
    let finishSearch: ((customers: (typeof customer)[]) => void) | undefined
    searchByPhone.mockReturnValueOnce(
      new Promise<(typeof customer)[]>((resolve) => {
        finishSearch = resolve
      })
    )

    render(<CustomerSelectionDialog open onOpenChange={vi.fn()} />)

    fireEvent.change(
      await screen.findByPlaceholderText('名前、電話番号、メールアドレス、会員番号で検索...'),
      { target: { value: '090-1234-5678' } }
    )
    await waitFor(() => expect(searchByPhone).toHaveBeenCalledWith('090-1234-5678'))

    expect(screen.queryByRole('button', { name: '新規顧客を登録' })).not.toBeInTheDocument()

    await act(async () => finishSearch?.([]))

    expect(await screen.findByRole('button', { name: '新規顧客を登録' })).toBeInTheDocument()
  })

  it('does not offer new registration for an empty initial list, a name miss, or a legacy invalid phone', async () => {
    search.mockResolvedValueOnce([])
    searchByPhone.mockResolvedValueOnce([])

    render(<CustomerSelectionDialog open onOpenChange={vi.fn()} />)

    const input = await screen.findByPlaceholderText(
      '名前、電話番号、メールアドレス、会員番号で検索...'
    )
    await waitFor(() => expect(getAll).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('button', { name: '新規顧客を登録' })).not.toBeInTheDocument()

    fireEvent.change(input, { target: { value: '該当なし' } })
    await waitFor(() => expect(search).toHaveBeenCalledWith('該当なし'))
    await waitFor(() => expect(screen.queryAllByText('検索中です…')).toHaveLength(0))
    expect(screen.queryByRole('button', { name: '新規顧客を登録' })).not.toBeInTheDocument()

    fireEvent.change(input, { target: { value: '090-123-4567' } })
    await waitFor(() => expect(searchByPhone).toHaveBeenCalledWith('090-123-4567'))
    await waitFor(() => expect(screen.queryAllByText('検索中です…')).toHaveLength(0))
    expect(screen.queryByRole('button', { name: '新規顧客を登録' })).not.toBeInTheDocument()
  })

  it('ignores a late empty response from an older phone search', async () => {
    let finishFirst: ((customers: (typeof customer)[]) => void) | undefined
    let finishSecond: ((customers: (typeof customer)[]) => void) | undefined
    searchByPhone
      .mockReturnValueOnce(
        new Promise<(typeof customer)[]>((resolve) => {
          finishFirst = resolve
        })
      )
      .mockReturnValueOnce(
        new Promise<(typeof customer)[]>((resolve) => {
          finishSecond = resolve
        })
      )

    render(<CustomerSelectionDialog open onOpenChange={vi.fn()} />)

    const input = await screen.findByPlaceholderText(
      '名前、電話番号、メールアドレス、会員番号で検索...'
    )
    fireEvent.change(input, { target: { value: '090-1111-1111' } })
    await waitFor(() => expect(searchByPhone).toHaveBeenCalledWith('090-1111-1111'))

    fireEvent.change(input, { target: { value: '090-2222-2222' } })
    await waitFor(() => expect(searchByPhone).toHaveBeenCalledWith('090-2222-2222'))

    const secondCustomer = {
      ...customer,
      id: 'legacy-customer-second',
      name: '後から入力した顧客',
      phone: '+819022222222',
    }
    await act(async () => finishSecond?.([secondCustomer]))
    expect(await screen.findByText('後から入力した顧客')).toBeInTheDocument()

    await act(async () => finishFirst?.([]))
    expect(screen.getByText('後から入力した顧客')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '新規顧客を登録' })).not.toBeInTheDocument()
  })

  it('does not expose new customer registration without customer:create permission', async () => {
    authState.permissions = ['customer:read', 'reservation:create']

    render(<CustomerSelectionDialog open onOpenChange={vi.fn()} />)

    await screen.findByPlaceholderText('名前、電話番号、メールアドレス、会員番号で検索...')
    expect(screen.queryByRole('button', { name: '新規顧客を登録' })).not.toBeInTheDocument()
  })

  it('does not load or search customer data without customer:read permission', async () => {
    authState.permissions = ['customer:create', 'reservation:create']

    render(<CustomerSelectionDialog open onOpenChange={vi.fn()} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('顧客情報の閲覧権限がありません。')
    expect(getAll).not.toHaveBeenCalled()
    expect(search).not.toHaveBeenCalled()
    expect(searchByPhone).not.toHaveBeenCalled()
    expect(
      screen.queryByPlaceholderText('名前、電話番号、メールアドレス、会員番号で検索...')
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '新規顧客を登録' })).not.toBeInTheDocument()
  })

  it('does not load reservation customer data without reservation:create permission', async () => {
    authState.permissions = ['customer:read', 'customer:create']

    render(<CustomerSelectionDialog open onOpenChange={vi.fn()} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('予約作成の権限がありません。')
    expect(getAll).not.toHaveBeenCalled()
    expect(search).not.toHaveBeenCalled()
    expect(searchByPhone).not.toHaveBeenCalled()
    expect(
      screen.queryByPlaceholderText('名前、電話番号、メールアドレス、会員番号で検索...')
    ).not.toBeInTheDocument()
  })

  it('hides the timeline shortcut while choosing a customer for an in-progress reservation', async () => {
    getAll.mockResolvedValueOnce([customer])

    render(<CustomerSelectionDialog open onOpenChange={vi.fn()} onSelectCustomer={vi.fn()} />)

    expect(await screen.findByText('[確認用] 旧実名顧客')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'タイムラインを確認する' })).not.toBeInTheDocument()
  })

  it('keeps lookup mode available with customer:read alone', async () => {
    authState.permissions = ['customer:read']

    render(<CustomerSelectionDialog open mode="lookup" onOpenChange={vi.fn()} />)

    expect(
      await screen.findByPlaceholderText('名前、電話番号、メールアドレス、会員番号で検索...')
    ).toBeInTheDocument()
    await waitFor(() => expect(getAll).toHaveBeenCalledTimes(1))
  })
})
