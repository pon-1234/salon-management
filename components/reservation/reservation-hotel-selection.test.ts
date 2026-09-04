/**
 * @design_doc   Notion #281 registered hotel reselection in reservation detail
 * @related_to   ReservationDialog and ReservationPrimarySummary
 * @known_issues None
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('reservation registered hotel selection', () => {
  it('loads the hotel master and offers it without entering full reservation edit mode', () => {
    const dialog = readFileSync(join(__dirname, 'reservation-dialog.tsx'), 'utf8')
    const sections = readFileSync(join(__dirname, 'reservation-dialog-sections.tsx'), 'utf8')

    expect(dialog).toContain("from '@/components/reservation/use-hotel-options'")
    expect(dialog).toContain('const hotelOptions = useHotelOptions(open, currentStore.id)')
    expect(dialog).toContain('hotelChoices={hotelOptions}')
    expect(sections).toContain('登録ホテルから再選択')
    expect(sections).not.toContain('isEditing && hotelChoices.length > 0')
  })
})
