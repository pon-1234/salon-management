/**
 * @design_doc https://app.notion.com/p/3ccdda8d8bde80b19a27f2cd7dd8a2d1
 * @related_to extract-gold-master-ikebukuro-preview.php - read-only legacy profile projection
 * @known_issues Legacy cast passwords and identity document images are never copied
 */
import type { PublicProfile } from '@/lib/cast/types'
import type { MediaAccountInput } from '@/lib/settings/media-catalog'

type LegacyRow = Record<string, string | number | null>
const text = (row: LegacyRow, key: string) => String(row[key] ?? '').trim()
function date(value: string): Date | null {
  const day = value.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day.startsWith('0000')) return null
  const parsed = new Date(`${day}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().startsWith(day) ? parsed : null
}
function labels(value: string, choices: string[], offset = 0): string[] {
  return value
    .split('#')
    .filter(Boolean)
    .map((key) => choices[Number(key) - offset])
    .filter(Boolean)
}
const bodyTypes = ['スレンダー', '普通', 'グラマー', 'ぽっちゃり', '小柄', '長身']
const personalities = [
  '正統派セラピスト',
  '清楚なお姉さん',
  'モデルなみのスタイル',
  'エッチなお姉さん',
  '魅惑の人妻',
  'エロすぎる痴女',
]
const services = [
  '睾丸マッサージ',
  'パウダーマッサージ',
  'オイルマッサージ',
  '指圧マッサージ',
  '全身マッサージ',
  '密着フェザータッチ',
  '鼠径部回春',
  '上半身リップ',
  '洗体サーサービス',
  '全身密着泡洗体',
  'トップレス',
  'Tバック',
  '手コキ',
]

export function projectLegacyCastProfile(row: LegacyRow) {
  if (
    Number(row.shop_no) !== 5600 ||
    !/^\d+$/.test(text(row, 'girl_no')) ||
    ![2, 3].includes(Number(row.lev))
  )
    throw new Error('Invalid scoped legacy cast')
  const publicProfile: PublicProfile = {
    bustCup: text(row, 'p_bust_cup'),
    bodyType: labels(text(row, 'p_type'), bodyTypes, 1),
    personality: labels(text(row, 'p_type2'), personalities, 1),
    availableServices: labels(text(row, 'p_play'), services),
    smoking: (['吸わない', '吸う', '電子タバコ'] as const)[Number(row.search_1)] ?? '吸わない',
    massageQualification: Number(row.search_2) === 1,
    qualificationDetails: text(row, 'search_2_text').split(/\r?\n/).filter(Boolean),
    homeVisit: Number(row.home_flg) === 1 ? 'OK' : 'NG',
    tattoo: Number(row.tattoo_flg) === 1 ? 'ある' : 'なし',
    bloodType: (['A', 'B', 'O', 'AB', '秘密'] as const)[Number(row.blood_flg)] ?? '秘密',
    birthplace: '',
    foreignerOk: Number(row.foreigner_flg) === 1 ? 'OK' : 'NG',
    hobbies: text(row, 'profile_new_1'),
    charmPoint: text(row, 'profile_new_2'),
    personalityOneWord: text(row, 'profile_new_3'),
    favoriteType: text(row, 'profile_new_4'),
    favoriteFood: text(row, 'profile_new_5'),
    specialTechnique: text(row, 'profile_new_6'),
    shopMessage: text(row, 'profile_new_7') || text(row, 'profile_cm'),
    customerMessage: text(row, 'profile_new_8'),
  }
  const availableOptions = [
    ...text(row, 'options_free')
      .split('#')
      .filter((id) => /^\d+$/.test(id))
      .map((id) => `legacy-option-free-${id}`),
    ...text(row, 'options')
      .split('#')
      .filter((id) => /^\d+$/.test(id))
      .map((id) => `legacy-option-paid-${id}`),
  ]
  return {
    id: `legacy-cast-${row.girl_no}`,
    name: text(row, 'name'),
    nameKana: null,
    age: Number(row.age ?? 0),
    height: Number(row.p_height ?? 0),
    bust: text(row, 'p_bust'),
    waist: Number(row.p_waist ?? 0),
    hip: Number(row.p_hip ?? 0),
    type: publicProfile.bodyType.join('・'),
    description: publicProfile.shopMessage,
    publicProfile,
    employmentStatus: Number(row.lev) === 3 ? 'retired' : 'active',
    netReservation: Number(row.lev) !== 3,
    phone: text(row, 'tel') || null,
    birthDate: date(text(row, 'birth')),
    joinedAt: date(text(row, 'regist_date')),
    retiredAt: date(text(row, 'quit_day')),
    blogWidget: text(row, 'blog_widget') || null,
    snsAccount: text(row, 'twitter_id') || null,
    interviewer: text(row, 'interviewer_name') || null,
    recruitmentMedia: text(row, 'recruitment_name') || null,
    photoIdVerifiedAt: Number(row.check_3) === 1 ? date(text(row, 'check_3_day')) : null,
    residenceCertificateVerifiedAt:
      Number(row.check_4) === 1 ? date(text(row, 'check_4_day')) : null,
    availableOptions,
  }
}

/** Fills absent values only; operational status, pricing, and operator edits remain authoritative. */
export function mergeMissingProfileFields(
  current: Record<string, unknown>,
  incoming: Record<string, unknown>
): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(incoming)) {
    if (['id', 'employmentStatus', 'netReservation', 'availableOptions'].includes(key)) continue
    const existing = current[key]
    if (
      key === 'publicProfile' &&
      existing &&
      typeof existing === 'object' &&
      value &&
      typeof value === 'object'
    ) {
      const changes = mergeMissingProfileFields(
        existing as Record<string, unknown>,
        value as Record<string, unknown>
      )
      if (Object.keys(changes).length) patch[key] = { ...existing, ...changes }
    } else if (
      (existing === null ||
        existing === undefined ||
        existing === '' ||
        (Array.isArray(existing) && !existing.length)) &&
      value !== null &&
      value !== ''
    ) {
      patch[key] = value
    }
  }
  return patch
}

function httpUrl(value: string): string {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? value : ''
  } catch {
    return ''
  }
}
export function projectLegacyMedia(row: LegacyRow): MediaAccountInput {
  if (!/^\d+$/.test(text(row, 'serial')) || !text(row, 'media_name'))
    throw new Error('Invalid legacy media')
  return {
    id: `legacy-media-${row.serial}`,
    name: text(row, 'media_name'),
    category: Number(row.kind) === 1 ? 'sales' : Number(row.kind) === 2 ? 'recruitment' : 'store',
    publicUrl: httpUrl(text(row, 'display_url')),
    adminUrl: httpUrl(text(row, 'media_url')),
    loginId: text(row, 'media_id'),
    password: text(row, 'media_pw'),
  }
}
