/**
 * @design_doc   Public cast detail must render the store-scoped migrated option catalog
 * @related_to   CastDetailContent and getPublicCastDetail
 * @known_issues None
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Store } from '@/lib/store/types'
import type { PublicCastDetail } from '@/lib/store/public-casts'
import { CastDetailContent } from './cast-detail-content'

describe('CastDetailContent', () => {
  it('shows migrated option names and prices supplied by the selected store', async () => {
    const user = userEvent.setup()
    const cast = {
      id: 'legacy-cast-56060',
      name: '確認キャスト',
      age: 25,
      height: 160,
      bust: 'C',
      waist: 58,
      hip: 84,
      type: 'standard',
      image: '/images/non-photo.svg',
      images: ['/images/non-photo.svg'],
      description: '紹介文',
      netReservation: true,
      requestAttendanceEnabled: false,
      panelDesignationRank: 0,
      regularDesignationRank: 0,
      workStatus: '未出勤',
      availableOptions: ['legacy-option-paid-1'],
      availableOptionSettings: [{ optionId: 'legacy-option-paid-1', visibility: 'public' }],
      availableOptionDetails: [
        {
          id: 'legacy-option-paid-1',
          name: '移行済みアロマ',
          description: '池袋店の実オプション',
          price: 2_000,
          note: null,
        },
      ],
      publicProfile: null,
    } as PublicCastDetail

    render(
      <CastDetailContent
        cast={cast}
        store={{ id: 'uat-ikebukuro', slug: 'ikebukuro', name: '池袋店' } as Store}
      />
    )

    expect(screen.getByRole('link', { name: 'このキャストで予約' })).toHaveAttribute(
      'href',
      '/ikebukuro/booking?cast=legacy-cast-56060'
    )
    expect(screen.getByRole('link', { name: '口コミを見る' })).toHaveAttribute(
      'href',
      '/ikebukuro/reviews?castId=legacy-cast-56060'
    )
    expect(screen.queryByRole('button', { name: '' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'オプション' }))

    expect(screen.getByText('移行済みアロマ')).toBeVisible()
    expect(screen.getByText('池袋店の実オプション')).toBeVisible()
    expect(screen.getByText('¥2,000')).toBeVisible()

    await user.click(screen.getByRole('tab', { name: '口コミ' }))

    expect(screen.queryByText('まだ口コミがありません')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'このキャストの口コミ一覧を見る' })).toHaveAttribute(
      'href',
      '/ikebukuro/reviews?castId=legacy-cast-56060'
    )
  })
})
