/**
 * @design_doc   Administrator cast profiles must tolerate incomplete legacy JSON at render time
 * @related_to   CastProfile and lib/cast/public-profile.ts
 * @known_issues None
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { Cast } from '@/lib/cast/types'

import { CastProfile } from './cast-profile'

function legacyCast(): Cast {
  return {
    id: 'legacy-cast-56060',
    name: 'さら',
    nameKana: 'さら',
    age: 24,
    height: 155,
    bust: '93',
    waist: 58,
    hip: 88,
    type: '01#03',
    image: '/images/non-photo.svg',
    images: ['/images/non-photo.svg'],
    description: '',
    netReservation: true,
    specialDesignationFee: null,
    regularDesignationFee: null,
    panelDesignationRank: 1,
    regularDesignationRank: 0,
    workStatus: '出勤',
    appointments: [],
    availableOptions: [],
    publicProfile: {
      bustCup: 3,
      legacyGirlNo: 56060,
      snapshotCutoff: '2026-07-20T04:00:00.000Z',
    },
    createdAt: new Date('2026-07-20T00:00:00.000Z'),
    updatedAt: new Date('2026-07-20T00:00:00.000Z'),
  } as unknown as Cast
}

describe('CastProfile', () => {
  it('renders basic administrator information when legacy public profile arrays are missing', () => {
    expect(() => render(<CastProfile cast={legacyCast()} />)).not.toThrow()

    expect(screen.getByRole('heading', { name: 'さら' })).toBeInTheDocument()
    expect(screen.queryByText('スタイル・個性')).not.toBeInTheDocument()
  })
})
