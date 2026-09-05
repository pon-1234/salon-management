/**
 * @design_doc https://app.notion.com/p/3ccdda8d8bde80b19a27f2cd7dd8a2d1
 * @related_to PublicProfileForm - public, internal-only, and unavailable option settings
 * @known_issues None
 */
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { PublicProfileForm } from './public-profile-form'
import { normalizeCast } from '@/lib/cast/mapper'
vi.mock('@/hooks/use-pricing', () => ({
  usePricing: () => ({
    optionPrices: [
      { id: 'a', name: 'アロマ', isActive: true },
      { id: 'b', name: '追加ケア', isActive: true },
    ],
  }),
}))
vi.mock('@/components/ui/image-upload', () => ({ ImageUpload: () => <div>画像</div> }))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
it('persists public, internal-only, and unavailable choices independently', () => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  const onSubmit = vi.fn()
  render(
    <PublicProfileForm
      cast={normalizeCast({
        id: 'cast',
        availableOptions: ['a'],
        availableOptionSettings: [{ optionId: 'a', visibility: 'internal' }],
      })}
      storeId="store-a"
      isEditing
      onSubmit={onSubmit}
    />
  )
  expect(screen.getByLabelText('アロマの対応')).toHaveValue('internal')
  fireEvent.change(screen.getByLabelText('アロマの対応'), { target: { value: 'public' } })
  fireEvent.change(screen.getByLabelText('追加ケアの対応'), { target: { value: 'internal' } })
  fireEvent.click(screen.getByRole('button', { name: '保存' }))
  expect(onSubmit).toHaveBeenLastCalledWith(
    expect.objectContaining({
      basicInfo: expect.objectContaining({
        availableOptions: ['a', 'b'],
        availableOptionSettings: [
          { optionId: 'a', visibility: 'public' },
          { optionId: 'b', visibility: 'internal' },
        ],
      }),
    })
  )
  fireEvent.change(screen.getByLabelText('アロマの対応'), { target: { value: 'unavailable' } })
  fireEvent.click(screen.getByRole('button', { name: '保存' }))
  expect(onSubmit).toHaveBeenLastCalledWith(
    expect.objectContaining({
      basicInfo: expect.objectContaining({
        availableOptions: ['b'],
        availableOptionSettings: [{ optionId: 'b', visibility: 'internal' }],
      }),
    })
  )
  expect(screen.queryByLabelText('紹介文')).not.toBeInTheDocument()
  expect(screen.getByText('画像設定', { exact: true })).toBeInTheDocument()
  expect(screen.getByText('可能オプション', { exact: true })).toBeInTheDocument()
})
