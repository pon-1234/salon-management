/**
 * @design_doc https://app.notion.com/p/3ccdda8d8bde80b19a27f2cd7dd8a2d1
 * @related_to TakeHomeBonusSettings: store-owned choices for four cast bonuses
 * @known_issues None
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TakeHomeBonusSettings } from './take-home-bonus-settings'
import {
  createDesignationFee,
  getDesignationFees,
  updateDesignationFee,
} from '@/lib/designation/data'
vi.mock('@/lib/designation/data', () => ({
  getDesignationFees: vi.fn(),
  createDesignationFee: vi.fn(),
  updateDesignationFee: vi.fn(),
  deleteDesignationFee: vi.fn(),
}))
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }))
describe('take-home master editor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getDesignationFees).mockResolvedValue([])
  })
  it.each([
    ['free', 'フリー指名'],
    ['panel', 'パネル指名'],
    ['recommend', 'おすすめP指名'],
    ['repeat', '本指名'],
  ])('creates an independently scoped %s choice', async (kind, label) => {
    vi.mocked(createDesignationFee).mockResolvedValue({
      id: kind,
      name: label + ' 手取UP',
      kind,
      price: 1500,
      isTakeHomeBonus: true,
      isActive: true,
      storeShare: 0,
      castShare: 0,
      sortOrder: 1,
    } as never)
    render(<TakeHomeBonusSettings storeId="store-a" />)
    await waitFor(() =>
      expect(getDesignationFees).toHaveBeenCalledWith({
        storeId: 'store-a',
        takeHomeOnly: true,
        includeInactive: true,
        surfaceErrors: true,
      })
    )
    fireEvent.change(screen.getByLabelText(`${label}の追加金額`), { target: { value: '1500' } })
    fireEvent.click(screen.getByRole('button', { name: `${label}の金額を追加` }))
    await waitFor(() =>
      expect(createDesignationFee).toHaveBeenCalledWith(
        expect.objectContaining({
          kind,
          price: 1500,
          isTakeHomeBonus: true,
          storeShare: 0,
          castShare: 0,
        }),
        'store-a'
      )
    )
  })
  it('edits an existing internal rate without changing a customer charge', async () => {
    const fee = {
      id: 'bonus-1',
      name: 'フリーUP',
      kind: 'free',
      price: 1000,
      isTakeHomeBonus: true,
      isActive: true,
      storeShare: 0,
      castShare: 0,
      sortOrder: 1,
    } as const
    vi.mocked(getDesignationFees).mockResolvedValue([fee])
    vi.mocked(updateDesignationFee).mockResolvedValue({ ...fee, price: 1500 })
    render(<TakeHomeBonusSettings storeId="store-a" />)
    fireEvent.change(await screen.findByLabelText('フリーUPの金額'), { target: { value: '1500' } })
    fireEvent.click(screen.getByRole('button', { name: 'フリーUPを保存' }))
    await waitFor(() =>
      expect(updateDesignationFee).toHaveBeenCalledWith(
        'bonus-1',
        expect.objectContaining({ price: 1500, isTakeHomeBonus: true }),
        'store-a'
      )
    )
  })
})
