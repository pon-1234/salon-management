/**
 * @design_doc   Notion #281 hotel master linkage
 * @related_to   QuickBookingVisitDetails and hotel settings API
 * @known_issues None
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { QuickBookingVisitDetails } from './quick-booking-panels'

describe('QuickBookingVisitDetails', () => {
  it('selects a registered hotel while preserving manual entry', () => {
    const onChange = vi.fn()
    render(
      <QuickBookingVisitDetails
        hotelName=""
        roomNumber=""
        locationMemo=""
        hotels={[
          {
            id: 'hotel-a',
            hotelName: '池袋グランドホテル',
            area: '豊島区',
            station: '池袋（北口）',
          },
          { id: 'hotel-b', hotelName: 'アメジスト' },
        ]}
        onChange={onChange}
      />
    )

    fireEvent.change(screen.getByLabelText('登録ホテルから選択'), {
      target: { value: 'hotel-b' },
    })
    expect(onChange).toHaveBeenCalledWith('hotelName', 'アメジスト')
    expect(
      screen.getByRole('option', { name: '豊島区 ＞ 池袋（北口） ＞ 池袋グランドホテル' })
    ).toBeInTheDocument()
    expect(screen.getByLabelText('ホテル名')).toBeInTheDocument()
  })

  it('does not repeat an obsolete legacy group already contained in the hotel name', () => {
    render(
      <QuickBookingVisitDetails
        hotelName=""
        roomNumber=""
        locationMemo=""
        hotels={[
          {
            id: 'hotel-legacy',
            hotelName: '池袋グランドホテル',
            area: 'グランドホテル',
          },
        ]}
        onChange={vi.fn()}
      />
    )

    expect(screen.getByRole('option', { name: '池袋グランドホテル' })).toBeInTheDocument()
    expect(screen.queryByText('グランドホテル ＞ 池袋グランドホテル')).not.toBeInTheDocument()
  })
})
