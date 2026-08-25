/**
 * @design_doc   docs/IKEBUKURO_FIELD_UAT_MANUAL.md reservation status labels
 * @related_to   status-display.ts
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'
import {
  compareReservationsForOpsList,
  getReservationStatusLabel,
  isCompletedOpsStatus,
} from './status-display'

describe('reservation status display', () => {
  it('labels shop holds and web bookings separately while they stay tentative', () => {
    expect(getReservationStatusLabel('pending', '電話')).toBe('仮予約（店舗）')
    expect(getReservationStatusLabel('tentative', 'WEB')).toBe('仮予約（WEB）')
    expect(getReservationStatusLabel('pending', 'Heaven')).toBe('仮予約（WEB）')
    expect(getReservationStatusLabel('pending', 'LINE')).toBe('仮予約（WEB）')
    expect(getReservationStatusLabel('pending', 'SNS')).toBe('仮予約（WEB）')
  })

  it('renames completed work to 完了 and exposes 事前確認', () => {
    expect(getReservationStatusLabel('completed')).toBe('完了')
    expect(getReservationStatusLabel('preconfirmed')).toBe('事前確認')
    expect(isCompletedOpsStatus('completed')).toBe(true)
  })

  it('orders 仮予約 and 修正待ち above 確定 and 事前確認, with 完了 last', () => {
    const ordered = [
      { id: 'done', status: 'completed', startTime: new Date('2026-08-15T01:00:00.000Z') },
      { id: 'confirmed', status: 'confirmed', startTime: new Date('2026-08-15T02:00:00.000Z') },
      { id: 'hold', status: 'pending', startTime: new Date('2026-08-15T04:00:00.000Z') },
      { id: 'precheck', status: 'preconfirmed', startTime: new Date('2026-08-15T03:00:00.000Z') },
      { id: 'fix', status: 'modifiable', startTime: new Date('2026-08-15T05:00:00.000Z') },
    ].sort(compareReservationsForOpsList)

    expect(ordered.map((item) => item.id)).toEqual(['hold', 'fix', 'confirmed', 'precheck', 'done'])
  })
})
