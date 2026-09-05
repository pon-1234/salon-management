/**
 * @design_doc https://app.notion.com/p/3ccdda8d8bde80b19a27f2cd7dd8a2d1
 * @related_to Legacy profile refresh - current and retired cast projection
 * @known_issues No authentication credentials are migrated
 */
import { expect, it } from 'vitest'
import {
  projectLegacyCastProfile,
  mergeMissingProfileFields,
  projectLegacyMedia,
} from './legacy-profile-refresh'
it('projects retired status, private dates and all structured public profile fields', () => {
  const cast = projectLegacyCastProfile({
    girl_no: '123',
    shop_no: '5600',
    lev: '3',
    name: '確認用',
    tel: '0312345678',
    birth: '1980-02-29',
    quit_day: '2025-03-01',
    check_3: '1',
    check_3_day: '2025-02-01',
    check_4: '0',
    check_4_day: '2025-02-02',
    p_type: '1#3',
    p_bust_cup: '5',
    pref_flg: '2',
    mail_ad: ' TEST@EXAMPLE.COM ',
    p_type2: '2',
    p_play: '0#2',
    options: '01#02#01',
    options_free: '01#02',
    profile_new_1: '料理',
    profile_new_7: '店長の紹介',
    profile_new_8: 'ご挨拶',
    search_1: '2',
  })
  expect(cast).toMatchObject({
    id: 'legacy-cast-123',
    employmentStatus: 'retired',
    netReservation: false,
    phone: '0312345678',
    photoIdVerifiedAt: new Date('2025-02-01T00:00:00Z'),
    residenceCertificateVerifiedAt: null,
    publicProfile: {
      bustCup: 'E',
      birthplace: '関東地方',
      bodyType: ['スレンダー', 'グラマー'],
      personality: ['清楚なお姉さん'],
      availableServices: ['睾丸マッサージ', 'オイルマッサージ'],
      hobbies: '料理',
      shopMessage: '店長の紹介',
      customerMessage: 'ご挨拶',
      smoking: '電子タバコ',
    },
  })
  expect(cast.birthDate).toEqual(new Date('1980-02-29T00:00:00Z'))
  expect(cast.loginEmail).toBe('test@example.com')
  expect(cast.availableOptions).toEqual([
    'legacy-option-free-1',
    'legacy-option-free-2',
    'legacy-option-paid-1',
    'legacy-option-paid-2',
  ])
  expect(() => projectLegacyCastProfile({ girl_no: '1', shop_no: '999', lev: '2' })).toThrow()
  expect(
    projectLegacyCastProfile({ girl_no: '1', shop_no: '5600', lev: '2', birth: '0000-00-00' })
      .birthDate
  ).toBeNull()
})
it('fills missing information while retaining operator edits and never reactivates retired casts', () => {
  const old = {
    phone: 'new-value',
    birthDate: null,
    publicProfile: { hobbies: '手入力', shopMessage: '' },
    employmentStatus: 'retired',
  }
  expect(
    mergeMissingProfileFields(old, {
      phone: 'legacy-value',
      birthDate: '1980-01-01',
      publicProfile: { hobbies: '旧情報', shopMessage: '旧紹介' },
      employmentStatus: 'active',
    })
  ).toEqual({
    birthDate: '1980-01-01',
    publicProfile: { hobbies: '手入力', shopMessage: '旧紹介' },
  })
})
it('projects media credentials separately from cast identities and rejects unsafe URLs', () => {
  expect(
    projectLegacyMedia({
      serial: '7',
      kind: '2',
      media_name: '採用媒体',
      media_id: 'login',
      media_pw: 'secret',
      lev: 0,
      memo: '掲載見送り',
      media_url: 'https://example.com/admin',
      display_url: 'javascript:alert(1)',
    })
  ).toMatchObject({
    id: 'legacy-media-7',
    name: '採用媒体',
    category: 'recruitment',
    loginId: 'login',
    password: 'secret',
    adminUrl: 'https://example.com/admin',
    publicUrl: '',
    isActive: false,
    notes: '掲載見送り',
  })
})
