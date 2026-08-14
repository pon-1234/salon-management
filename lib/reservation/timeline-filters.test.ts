/**
 * @design_doc   docs/PREVIEW_UAT_CHECKLIST.md reservation timeline operational filters
 * @related_to   ReservationPageContent and FilterDialog
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'
import type { Cast } from '@/lib/cast/types'
import { filterAndSortTimelineCasts } from './timeline-filters'

function cast(overrides: Partial<Cast> & Pick<Cast, 'id' | 'name'>): Cast {
  return {
    createdAt: new Date('2026-08-01T00:00:00+09:00'),
    updatedAt: new Date('2026-08-01T00:00:00+09:00'),
    nameKana: overrides.name,
    age: 25,
    height: 160,
    bust: 'C',
    waist: 58,
    hip: 84,
    type: 'standard',
    image: '',
    images: [],
    description: '',
    netReservation: true,
    specialDesignationFee: null,
    regularDesignationFee: null,
    panelDesignationRank: 0,
    regularDesignationRank: 0,
    workStatus: '出勤',
    appointments: [],
    availableOptions: [],
    ...overrides,
  }
}

describe('filterAndSortTimelineCasts', () => {
  const early = cast({
    id: 'early',
    name: 'あかり',
    nameKana: 'あかり',
    workStart: new Date('2026-08-15T10:00:00+09:00'),
    workEnd: new Date('2026-08-15T18:00:00+09:00'),
    regularDesignationRank: 2,
    panelDesignationRank: 3,
    availableOptions: ['option-aroma'],
  })
  const late = cast({
    id: 'late',
    name: 'みさき',
    nameKana: 'みさき',
    workStart: new Date('2026-08-15T14:00:00+09:00'),
    workEnd: new Date('2026-08-15T22:00:00+09:00'),
    availableOptions: ['option-other'],
    appointments: [
      {
        id: 'reservation-1',
        customerId: 'customer-1',
        serviceId: 'course-1',
        staffId: 'late',
        serviceName: '8時間貸切',
        startTime: new Date('2026-08-15T14:00:00+09:00'),
        endTime: new Date('2026-08-15T22:00:00+09:00'),
        customerName: '顧客',
        customerPhone: '',
        customerEmail: '',
        reservationTime: '14:00-22:00',
        status: 'confirmed',
        price: 0,
      },
    ],
  })

  it('defaults to attendance start order and keeps rank data intact', () => {
    const result = filterAndSortTimelineCasts([late, early], {
      availability: 'all',
      optionId: '',
      name: '',
    })

    expect(result.map((entry) => entry.id)).toEqual(['early', 'late'])
    expect(result[0]).toMatchObject({ regularDesignationRank: 2, panelDesignationRank: 3 })
  })

  it('filters to casts with a real 30-minute opening', () => {
    const result = filterAndSortTimelineCasts([late, early], {
      availability: 'open',
      optionId: '',
      name: '',
    })

    expect(result.map((entry) => entry.id)).toEqual(['early'])
  })

  it('combines option and name filters without losing scheduled appointments', () => {
    const result = filterAndSortTimelineCasts([late, early], {
      availability: 'all',
      optionId: 'option-aroma',
      name: 'あか',
    })

    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('early')
    expect(result[0]?.appointments).toBe(early.appointments)
  })
})
