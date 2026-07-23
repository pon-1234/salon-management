/**
 * @design_doc   Cast API records are normalized before rendering administrator profile screens
 * @related_to   mapper.ts and components/cast/cast-profile.tsx
 * @known_issues None currently
 */
import { describe, expect, it } from 'vitest'

import { normalizeCast } from './mapper'

describe('normalizeCast', () => {
  it('rejects incomplete legacy profile metadata before administrator rendering', () => {
    const cast = normalizeCast({
      id: 'legacy-cast-56229',
      name: 'Legacy Cast',
      publicProfile: {
        legacyGirlNo: 56229,
        bustCup: 3,
        snapshotCutoff: '2026-07-20T04:00:00.000Z',
      },
    })

    expect(cast.publicProfile).toBeUndefined()
  })
})
