/**
 * @design_doc docs/verification/2026-09-05-notion-recheck.md
 * @related_to profile-refresh-plan - additive legacy cast/media refresh
 * @known_issues Synthetic fixtures contain no real personal records
 */
import { expect, it } from 'vitest'
import { buildProfileRefreshPlan } from './profile-refresh-plan'
const row = {
  girl_no: '1',
  shop_no: '5600',
  lev: '3',
  name: 'Fixture',
  age: '40',
  p_height: '160',
  p_waist: '60',
  p_hip: '85',
  tel: '0311111111',
  mail_ad: 'fixture@example.com',
  profile_new_1: 'legacy hobby',
}
const snapshot = {
  kind: 'cast-profiles',
  shopNo: 5600,
  capturedAt: '2026-09-05T18:00:00+09:00',
  casts: [row],
  media: [
    {
      serial: '1',
      media_name: '営業媒体',
      kind: 1,
      lev: 1,
      media_pw: 'source-secret',
      media_id: 'source-id',
      memo: 'imported note',
    },
  ],
}
const photo = '/salon-uploads/casts/ikebukuro/legacy-cast-1/01-1234567890abcdef.jpg'
it('adds retired records with verified images and never enables booking for newly imported casts', () => {
  const plan = buildProfileRefreshPlan(snapshot, [], [], { 'legacy-cast-1': [photo] }, new Set())
  expect(plan.creates[0]).toMatchObject({
    id: 'legacy-cast-1',
    employmentStatus: 'retired',
    netReservation: false,
    image: photo,
    images: [photo],
    loginEmail: 'fixture@example.com',
  })
  expect(plan.media[0]).toMatchObject({
    id: 'legacy-media-1',
    password: 'source-secret',
    notes: 'imported note',
  })
  expect(JSON.stringify(plan.creates)).not.toContain('passwordHash')
})
it('preserves current edits, deliberate profile blanks, retirement and internal options', () => {
  const old = {
    id: 'legacy-cast-1',
    storeId: 'uat-ikebukuro',
    updatedAt: '2026-09-05T00:00:00Z',
    phone: 'edited-phone',
    employmentStatus: 'retired',
    publicProfile: { hobbies: '' },
    image: '/manual.jpg',
    images: ['/manual.jpg'],
    availableOptions: ['manual-option'],
  }
  const media = [
    {
      id: 'manual-id',
      name: '営業媒体',
      category: 'sales' as const,
      password: 'edited-secret',
      loginId: '',
      notes: 'manual note',
    },
  ]
  const plan = buildProfileRefreshPlan(
    snapshot,
    [old],
    media,
    { 'legacy-cast-1': [photo] },
    new Set()
  )
  expect(plan.creates).toEqual([])
  const data = plan.updates[0].data
  for (const key of [
    'phone',
    'publicProfile',
    'employmentStatus',
    'availableOptions',
    'image',
    'images',
  ])
    expect(data).not.toHaveProperty(key)
  expect(plan.media[0]).toMatchObject({
    id: 'legacy-media-1',
    password: 'edited-secret',
    loginId: 'source-id',
    notes: 'manual note',
  })
  expect(plan.updates[0].expectedUpdatedAt).toBe(old.updatedAt)
})
it('rejects wrong stores and duplicate source IDs before producing mutations', () => {
  expect(() => buildProfileRefreshPlan({ ...snapshot, shopNo: 1 }, [], [], {}, new Set())).toThrow()
  expect(() =>
    buildProfileRefreshPlan({ ...snapshot, casts: [row, row] }, [], [], {}, new Set())
  ).toThrow()
  expect(() =>
    buildProfileRefreshPlan(
      snapshot,
      [{ id: 'legacy-cast-1', storeId: 'other' }],
      [],
      {},
      new Set()
    )
  ).toThrow()
})
it('decodes unchanged legacy numeric body types while preserving edited labels', () => {
  const input = { ...snapshot, casts: [{ ...row, p_type: '01#03' }] }
  const old = { id: 'legacy-cast-1', storeId: 'uat-ikebukuro', publicProfile: { hobbies: '' } }
  expect(
    buildProfileRefreshPlan(input, [{ ...old, type: '01#03' }], [], {}, new Set()).updates[0].data
      .type
  ).toBe('スレンダー・グラマー')
  expect(
    buildProfileRefreshPlan(input, [{ ...old, type: '手入力' }], [], {}, new Set()).updates[0].data
  ).not.toHaveProperty('type')
})
it('does not assign duplicate account emails or accept unverified image paths', () => {
  const plan = buildProfileRefreshPlan(snapshot, [], [], {}, new Set(['fixture@example.com']))
  expect(plan.creates[0].loginEmail).toBeNull()
  expect(plan.conflictingEmails).toBe(1)
  expect(() =>
    buildProfileRefreshPlan(snapshot, [], [], { 'legacy-cast-1': ['/secret.png'] }, new Set())
  ).toThrow()
})
