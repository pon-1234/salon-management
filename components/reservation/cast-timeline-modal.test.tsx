/**
 * @design_doc   Reservation timeline dialog accessibility contract
 * @related_to   CastTimelineModal, Radix Dialog description wiring
 * @known_issues None
 */
import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PublicCastSchedule } from '@/lib/store/public-schedule'
import { buildTimelineSlots, CastTimelineModal } from './cast-timeline-modal'

const legacyOffsetSchedule: PublicCastSchedule = {
  id: 'schedule-legacy-offset',
  castId: 'cast-legacy-offset',
  date: '2099-01-20T00:00:00+09:00',
  startTime: '2099-01-20T11:10:00+09:00',
  endTime: '2099-01-20T12:10:00+09:00',
  isAvailable: true,
  reservations: [],
  cast: {
    id: 'cast-legacy-offset',
    name: '端数開始キャスト',
    age: null,
    height: null,
    bust: null,
    waist: null,
    hip: null,
    type: null,
    image: null,
    images: [],
    panelDesignationRank: 0,
    workStatus: '出勤',
  },
}

describe('CastTimelineModal accessibility', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('connects the dialog description without a Radix accessibility warning', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      })
    )
    const warningSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    render(
      <CastTimelineModal
        open={true}
        initialDate={new Date('2026-07-20T00:00:00+09:00')}
        storeId="ikebukuro"
        onClose={vi.fn()}
        onSelectSlot={vi.fn()}
      />
    )

    await act(async () => undefined)

    const dialog = screen.getByRole('dialog')
    const descriptionId = dialog.getAttribute('aria-describedby')
    expect(descriptionId).toBeTruthy()
    expect(document.getElementById(descriptionId!)).toHaveTextContent(
      '選択した日のキャスト別空き時間を確認し、予約枠を選択できます。'
    )
    expect(
      warningSpy.mock.calls.some(([message]) =>
        String(message).includes('Missing `Description` or `aria-describedby={undefined}`')
      )
    ).toBe(false)
  })

  it('starts selectable timeline slots at the next reservation start boundary', () => {
    const slots = buildTimelineSlots(legacyOffsetSchedule)

    expect(slots.map((slot) => slot.startIso)).toEqual([
      '2099-01-20T02:10:00.000Z',
      '2099-01-20T02:40:00.000Z',
    ])
  })
})
