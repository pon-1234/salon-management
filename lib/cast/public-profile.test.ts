/**
 * @design_doc   Public profile JSON is validated at API and server-rendering boundaries
 * @related_to   public-profile.ts
 * @known_issues None currently
 */
import { describe, expect, it } from 'vitest'

import { normalizePublicProfile } from './public-profile'

const validProfile = {
  bustCup: 'E',
  bodyType: ['スレンダー'],
  personality: ['穏やか'],
  availableServices: ['オイルマッサージ'],
  smoking: '吸わない' as const,
  massageQualification: false,
  qualificationDetails: [],
  homeVisit: 'NG' as const,
  tattoo: 'なし' as const,
  bloodType: '秘密' as const,
  birthplace: '関東地方',
  foreignerOk: 'NG' as const,
  hobbies: '読書',
  charmPoint: '笑顔',
  personalityOneWord: '穏やか',
  favoriteType: '紳士的な方',
  favoriteFood: '和食',
  specialTechnique: 'マッサージ',
  shopMessage: 'お店からの紹介',
  customerMessage: 'よろしくお願いします',
}

describe('normalizePublicProfile', () => {
  it('preserves a complete profile while removing non-profile metadata', () => {
    expect(
      normalizePublicProfile({
        ...validProfile,
        legacyGirlNo: 56229,
        snapshotCutoff: '2026-07-20T04:00:00.000Z',
      })
    ).toEqual(validProfile)
  })

  it.each([null, 123, [], { bustCup: 'E' }])('rejects incomplete input %#', (value) => {
    expect(normalizePublicProfile(value)).toBeNull()
  })
})
