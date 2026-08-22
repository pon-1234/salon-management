/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md A-4
 * @related_to   InfiniTalk HTML/URL popup push; CTIProvider incoming overlay
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'
import {
  INFINITALK_POPUP_PATH,
  buildInfiniTalkPopupUrlTemplate,
  createIncomingCallBroadcast,
  isIncomingCallBroadcast,
  readCalledNumber,
  readIncomingCallPhone,
  stripIncomingCallParams,
} from './incoming-call-params'

describe('InfiniTalk incoming-call params', () => {
  it('reads InfiniTalk telno before the legacy tel query', () => {
    const params = new URLSearchParams('telno=09012345678&tel=08000000000&calledno=0312345678')

    expect(readIncomingCallPhone(params)).toBe('09012345678')
    expect(readCalledNumber(params)).toBe('0312345678')
  })

  it('keeps the existing ?tel= trigger when InfiniTalk telno is absent', () => {
    expect(readIncomingCallPhone(new URLSearchParams('tel=090-1234-5678'))).toBe('090-1234-5678')
  })

  it('ignores unsubstituted InfiniTalk placeholders', () => {
    expect(readIncomingCallPhone(new URLSearchParams('telno={発信番号}'))).toBeNull()
    expect(readCalledNumber(new URLSearchParams('calledno={着信番号}'))).toBeNull()
  })

  it('strips InfiniTalk keys from the URL while keeping unrelated search params', () => {
    const url = new URL(
      'https://salon.example/admin/reservation?view=timeline&telno=09012345678&calledno=0312345678'
    )

    expect(stripIncomingCallParams(url)).toBe(true)
    expect(url.searchParams.get('view')).toBe('timeline')
    expect(url.searchParams.get('telno')).toBeNull()
    expect(url.searchParams.get('calledno')).toBeNull()
  })

  it('accepts InfiniTalk broadcast payloads and rejects unrelated messages', () => {
    const payload = createIncomingCallBroadcast('09012345678', '0312345678')
    expect(isIncomingCallBroadcast(payload)).toBe(true)
    expect(isIncomingCallBroadcast({ type: 'incoming-call' })).toBe(false)
    expect(isIncomingCallBroadcast(null)).toBe(false)
  })

  it('documents the InfiniTalk screen-popup URL template', () => {
    expect(INFINITALK_POPUP_PATH).toBe('/admin/cti/incoming')
    expect(buildInfiniTalkPopupUrlTemplate('https://salon.c-platinum.com')).toBe(
      'https://salon.c-platinum.com/admin/cti/incoming?telno={発信番号}&calledno={着信番号}'
    )
  })
})
