/**
 * @design_doc https://app.notion.com/p/3ccdda8d8bde80ec928cc17adff35cde
 * @related_to AdminInfoPage - manager staff creation and self profile editing
 * @known_issues Synthetic inactive staff fixtures only
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import AdminInfoPage from './page'
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'manager',
        role: 'admin',
        adminRole: 'manager',
        storeIds: ['store-a'],
      },
    },
  }),
}))
vi.mock('@/contexts/store-context', () => ({
  useStore: () => ({
    currentStore: { id: 'store-a' },
    availableStores: [{ id: 'store-a', name: '店舗A' }],
  }),
}))
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }))
const records = [
  { id: 'manager', name: 'Manager', role: 'manager', storeIds: ['store-a'] },
  { id: 'staff', name: 'Staff', role: 'staff', storeIds: ['store-a'] },
  { id: 'other', name: 'Other manager', role: 'manager', storeIds: ['store-a'] },
  { id: 'cross', name: 'Cross-store staff', role: 'staff', storeIds: ['store-b'] },
].map((row) => ({
  ...row,
  email: `${row.id}@example.invalid`,
  isActive: true,
  permissions: [],
  lastLogin: null,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
}))
beforeEach(() => {
  vi.mocked(fetch).mockReset()
  vi.mocked(fetch).mockImplementation(
    async () => ({ ok: true, json: async () => ({ admins: records }) }) as Response
  )
})
it('enables scoped staff controls and keeps own access fields locked', async () => {
  render(<AdminInfoPage />)
  expect(await screen.findByRole('button', { name: 'Managerを編集' })).toBeEnabled()
  expect(screen.getByRole('button', { name: 'Staffを編集' })).toBeEnabled()
  expect(screen.getByRole('button', { name: 'Other managerを編集' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Cross-store staffを編集' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Managerを編集' }))
  expect(screen.getByLabelText('権限')).toBeDisabled()
  expect(screen.getByRole('checkbox')).toBeDisabled()
  expect(screen.getByRole('switch')).toBeDisabled()
  fireEvent.change(screen.getByLabelText('氏名'), { target: { value: 'Updated Manager' } })
  fireEvent.click(screen.getByRole('button', { name: '更新する' }))
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(
      '/api/admin',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ id: 'manager', name: 'Updated Manager' }),
      })
    )
  )
})
it('creates staff assigned to the current store without permitting role escalation', async () => {
  render(<AdminInfoPage />)
  fireEvent.click(await screen.findByRole('button', { name: '管理者を追加' }))
  expect(screen.getByLabelText('権限')).toBeDisabled()
  fireEvent.change(screen.getByLabelText('氏名'), { target: { value: 'Test staff' } })
  fireEvent.change(screen.getByLabelText('メールアドレス'), {
    target: { value: 'test@example.invalid' },
  })
  fireEvent.change(screen.getByLabelText('初期パスワード'), {
    target: { value: 'synthetic-test-password' },
  })
  fireEvent.click(screen.getByRole('switch'))
  fireEvent.click(screen.getByRole('button', { name: '追加する' }))
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith('/api/admin', expect.objectContaining({ method: 'POST' }))
  )
  const sent = vi.mocked(fetch).mock.calls.find((call) => call[1]?.method === 'POST')!
  expect(JSON.parse(sent[1]!.body as string)).toMatchObject({
    role: 'staff',
    storeIds: ['store-a'],
    isActive: false,
  })
})
