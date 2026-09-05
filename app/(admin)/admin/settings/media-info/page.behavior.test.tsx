/**
 * @design_doc https://app.notion.com/p/3ccdda8d8bde80ec928cc17adff35cde
 * @related_to MediaInfoPage - searchable list with explicit per-site editing
 * @known_issues None
 */
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import MediaInfoPage from './page'
vi.mock('@/contexts/store-context', () => ({
  useStore: () => ({ currentStore: { id: 'store-a' } }),
}))
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
it('shows media as a searchable list and opens credentials only for the selected edit row', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: {
          marketingChannels: ['電話', '駅ちか', '未登録の媒体'],
          marketingMethods: ['電話'],
          mediaAccounts: [
            {
              id: 'site-a',
              name: '駅ちか',
              category: 'sales',
              publicUrl: 'https://example.com',
              loginId: 'user',
              password: '',
              isActive: false,
              notes: '掲載見送り',
            },
            { id: 'site-b', name: '求人サイト', category: 'recruitment' },
          ],
        },
      }),
    }))
  )
  render(<MediaInfoPage />)
  await screen.findByText('駅ちか（保留中）')
  expect(screen.queryByLabelText('ログインID')).not.toBeInTheDocument()
  expect(screen.queryByText('電話')).not.toBeInTheDocument()
  expect(screen.queryByText('未登録の媒体')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '駅ちかを編集する' }))
  expect(screen.getByLabelText('ログインID')).toHaveValue('user')
  expect(screen.getByLabelText('掲載中')).not.toBeChecked()
  expect(screen.getByLabelText('備考')).toHaveValue('掲載見送り')
  fireEvent.change(screen.getByLabelText('媒体を検索'), { target: { value: '求人' } })
  expect(screen.queryByText('駅ちか（保留中）')).not.toBeInTheDocument()
  expect(screen.getByText('求人サイト')).toBeInTheDocument()
})

it('prevents empty overwrite when loading fails and shows an actionable error', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: false }))
  )
  render(<MediaInfoPage />)
  expect(screen.getByRole('button', { name: /^保存$/ })).toBeDisabled()
  expect(await screen.findByRole('alert')).toHaveTextContent('読み込めませんでした')
  expect(screen.getByRole('button', { name: '媒体を追加' })).toBeDisabled()
})
