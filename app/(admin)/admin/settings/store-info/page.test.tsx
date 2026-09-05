/**
 * @design_doc https://app.notion.com/p/3ccdda8d8bde80ec928cc17adff35cde
 * @related_to StoreInfoPage - saves edited fields without resubmitting legacy blanks or credentials
 * @known_issues None
 */
import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import StoreInfoPage from './page'

const store = vi.hoisted(() => ({ id: 'store-a' }))
vi.mock('@/contexts/store-context', () => ({ useStore: () => ({ currentStore: store }) }))
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  store.id = 'store-a'
})

it('does not restore removed channels after reload', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: { marketingMethods: [], marketingChannels: [] } }),
    }))
  )
  render(<StoreInfoPage />)
  expect(await screen.findByLabelText('集客チャンネル')).toHaveValue('')
})

it('ignores an older store response after switching stores', async () => {
  let resolveOld!: (value: unknown) => void
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      url.includes('store-a')
        ? new Promise((resolve) => {
            resolveOld = resolve
          })
        : Promise.resolve({
            ok: true,
            json: async () => ({
              data: { marketingMethods: ['SMS'], marketingChannels: ['SMS', 'B媒体'] },
            }),
          })
    )
  )
  const view = render(<StoreInfoPage />)
  store.id = 'store-b'
  view.rerender(<StoreInfoPage />)
  expect(await screen.findByLabelText('集客チャンネル')).toHaveValue('B媒体')
  await act(async () => {
    resolveOld({
      ok: true,
      json: async () => ({
        data: { marketingMethods: ['電話'], marketingChannels: ['電話', 'A媒体'] },
      }),
    })
  })
  expect(screen.getByLabelText('集客チャンネル')).toHaveValue('B媒体')
})

it('saves changed booking methods with legacy blank contact fields and preserves them after reload', async () => {
  const settings = {
    storeName: '',
    address: '',
    phone: '',
    email: '',
    marketingMethods: ['電話', 'WEB'],
    marketingChannels: ['電話', 'WEB', '駅ちか'],
    mediaAccounts: [{ id: 'a', name: '駅ちか', category: 'sales', password: 'private' }],
  }
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'PUT') Object.assign(settings, JSON.parse(String(init.body)))
    return { ok: true, json: async () => ({ data: settings }) }
  })
  vi.stubGlobal('fetch', fetchMock)
  const view = render(<StoreInfoPage />)
  await screen.findByLabelText('集客手段')
  fireEvent.change(screen.getByLabelText('集客手段'), { target: { value: '電話\nWEB\nSMS\nLINE' } })
  fireEvent.click(screen.getByRole('button', { name: /^保存$/ }))
  await waitFor(() =>
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(true)
  )
  const payload = JSON.parse(
    String(fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')?.[1]?.body)
  )
  expect(payload).toEqual({
    marketingMethods: ['電話', 'WEB', 'SMS', 'LINE'],
    marketingChannels: ['電話', 'WEB', 'SMS', 'LINE', '駅ちか'],
  })
  view.unmount()
  render(<StoreInfoPage />)
  expect(await screen.findByLabelText('集客手段')).toHaveValue('電話\nWEB\nSMS\nLINE')
  expect(screen.getByLabelText('集客チャンネル')).toHaveValue('駅ちか')
})
