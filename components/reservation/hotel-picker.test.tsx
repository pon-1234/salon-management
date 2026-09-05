/**
 * @design_doc https://app.notion.com/p/3ccdda8d8bde80ec928cc17adff35cde
 * @related_to HotelPicker - region/exit filtering for reservations
 * @known_issues Synthetic hotel fixtures only
 */
import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { HotelPicker } from './hotel-picker'
it('filters by region and exit without changing the saved hotel until an explicit selection', () => {
  const onChange = vi.fn()
  render(
    <HotelPicker
      id="test"
      label="ホテル"
      hotelName=""
      onChange={onChange}
      hotels={[
        { id: 'a', hotelName: 'ホテルA', area: '豊島区', station: '北口' },
        { id: 'b', hotelName: 'ホテルB', area: '豊島区', station: '南口' },
        { id: 'c', hotelName: 'ホテルC', area: '新宿区', station: '東口' },
      ]}
    />
  )
  fireEvent.change(screen.getByLabelText('ホテルの地域'), { target: { value: '豊島区' } })
  fireEvent.change(screen.getByLabelText('ホテルの駅・出口'), { target: { value: '北口' } })
  expect(
    within(screen.getByLabelText('ホテル'))
      .getAllByRole('option')
      .map((el) => el.textContent)
  ).toEqual(['直接入力', '豊島区 ＞ 北口 ＞ ホテルA'])
  expect(onChange).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('ホテル'), { target: { value: 'a' } })
  expect(onChange).toHaveBeenCalledWith('ホテルA')
  fireEvent.change(screen.getByLabelText('ホテルの地域'), { target: { value: '新宿区' } })
  expect(screen.getByLabelText('ホテルの駅・出口')).toHaveValue('')
})
