/**
 * @design_doc   Admin reservation page permission wiring
 * @related_to   ReservationPageContent, ActionButtons, and Timeline
 * @known_issues None
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(join(__dirname, 'reservation-page-content.tsx'), 'utf8')

describe('ReservationPageContent permission wiring', () => {
  it('requires both customer read and reservation create before enabling creation controls', () => {
    expect(source).toContain("hasPermission(grantedPermissions, 'customer:read')")
    expect(source).toContain("hasPermission(grantedPermissions, 'reservation:create')")
    expect(source).toMatch(/<ActionButtons[\s\S]*?canCreateReservation=\{canCreateReservation\}/)
    expect(source).toMatch(/<Timeline[\s\S]*?canCreateReservation=\{canCreateReservation\}/)
  })

  it('keeps existing reservations viewable but only passes save access with update permission', () => {
    expect(source).toContain("hasPermission(grantedPermissions, 'reservation:update')")
    expect(source).toMatch(
      /<ReservationDialog[\s\S]*?onSave=\{canUpdateReservation \? handleReservationSave : undefined\}/
    )
  })
})
