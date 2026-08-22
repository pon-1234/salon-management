/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md A-4
 * @related_to   CTIProvider: InfiniTalk HTML/URL popup; IncomingCallPopup overlay
 * @known_issues InfiniTalk still opens this URL from its client; browser popup blockers remain an operator setting
 */

export const INFINITALK_POPUP_PATH = '/admin/cti/incoming'
export const CTI_INCOMING_CHANNEL = 'salon-cti-incoming'

const CALLER_PARAM_KEYS = ['telno', 'tel', 'phone'] as const
const CALLED_PARAM_KEYS = ['calledno'] as const

type SearchReader = Pick<URLSearchParams, 'get'>

function isUnsubstitutedPlaceholder(value: string): boolean {
  return /[{}%]/.test(value) || /発信番号|着信番号/.test(value)
}

function readUsableParam(params: SearchReader, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = params.get(key)?.trim()
    if (!value || isUnsubstitutedPlaceholder(value) || !/\d/.test(value)) continue
    return value
  }
  return null
}

export function readIncomingCallPhone(params: SearchReader): string | null {
  return readUsableParam(params, CALLER_PARAM_KEYS)
}

export function readCalledNumber(params: SearchReader): string | null {
  return readUsableParam(params, CALLED_PARAM_KEYS)
}

export function stripIncomingCallParams(url: URL): boolean {
  let changed = false
  for (const key of [...CALLER_PARAM_KEYS, ...CALLED_PARAM_KEYS]) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key)
      changed = true
    }
  }
  return changed
}

export function buildInfiniTalkPopupUrlTemplate(origin: string): string {
  const normalizedOrigin = origin.replace(/\/+$/, '')
  return `${normalizedOrigin}${INFINITALK_POPUP_PATH}?telno={発信番号}&calledno={着信番号}`
}

export function createIncomingCallBroadcast(phoneNumber: string, calledNumber: string | null) {
  return {
    type: 'incoming-call' as const,
    phoneNumber,
    calledNumber,
    receivedAt: Date.now(),
  }
}

export function isIncomingCallBroadcast(
  value: unknown
): value is ReturnType<typeof createIncomingCallBroadcast> {
  if (!value || typeof value !== 'object') return false
  const record = value as { type?: unknown; phoneNumber?: unknown }
  return record.type === 'incoming-call' && typeof record.phoneNumber === 'string'
}
