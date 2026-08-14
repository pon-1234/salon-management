/**
 * @design_doc   Customer detail reservation persistence and history selection contract
 * @related_to   CustomerProfile, ReservationDialog, CustomerRepositoryImpl
 * @known_issues None
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(join(__dirname, 'page.tsx'), 'utf8')

describe('customer profile reservation actions', () => {
  it('renders the assigned cast name and image from the loaded cast directory', () => {
    expect(source).toContain('const availableCastById = useMemo(')
    expect(source).toMatch(
      /const assignedCast = availableCastById\.get\(\s*reservation\.castId \?\? reservation\.staffId\s*\)/
    )
    expect(source).toContain(
      'src={assignedCast?.image?.trim() ? assignedCast.image : FALLBACK_IMAGE}'
    )
    expect(source).toContain(
      "{assignedCast?.name ?? reservation.staffName ?? '担当キャスト未設定'}"
    )
    expect(source).not.toContain('<h3 className="font-medium">スタッフ名</h3>')
  })

  it('exposes the persisted customer phone number as a tel link', () => {
    expect(source).toContain('href={getCustomerPhoneTelHref(customer.phone)}')
    expect(source).toContain('{formatPhoneNumber(customer.phone)}')
  })

  it('does not treat a domestic and E.164 representation of the same phone as a change', () => {
    expect(source).toContain('!isSameCustomerPhone(data.phone, customer.phone)')
    expect(source).not.toContain(
      'normalizePhoneQuery(data.phone) !== normalizePhoneQuery(customer.phone)'
    )
  })

  it('persists dialog updates and reloads the customer reservation snapshot', () => {
    expect(source).toContain('const handleReservationSave = async (')
    expect(source).toContain('await reservationRepository.update(reservationId, { ...payload })')
    expect(source).toContain('await reloadCustomerReservations()')
    expect(source).toMatch(
      /<ReservationDialog[\s\S]*?onSave=\{canUpdateReservation \? handleReservationSave : undefined\}/
    )
  })

  it('keeps reservation history viewable but requires update permission for dialog changes', () => {
    expect(source).toContain("hasPermission(grantedPermissions, 'reservation:update')")
    expect(source).toContain('onSave={canUpdateReservation ? handleReservationSave : undefined}')
  })

  it('exposes new reservation creation only with customer read and reservation create permissions', () => {
    expect(source).toContain("hasPermission(grantedPermissions, 'customer:read')")
    expect(source).toContain("hasPermission(grantedPermissions, 'reservation:create')")
    expect(source).toMatch(/const handleBooking = \(\) => \{\s*if \(!canCreateReservation\) return/)
    expect(source).toMatch(
      /\{canCreateReservation \? \([\s\S]*?onClick=\{handleBooking\}[\s\S]*?\) : null\}/
    )
  })

  it('exposes customer, point, and NG mutations only with customer update permission', () => {
    expect(source).toContain(
      "const canUpdateCustomer = hasPermission(grantedPermissions, 'customer:update')"
    )
    expect(source).toMatch(
      /\{canUpdateCustomer \? \([\s\S]*?onClick=\{\(\) => setIsEditing\(true\)\}[\s\S]*?編集[\s\S]*?\) : null\}/
    )
    expect(source).toContain('{canUpdateCustomer && customer && (')
    expect(source).toContain('{canUpdateCustomer ? (')
    expect(source).toMatch(
      /\{canUpdateCustomer \? \([\s\S]*?<NgCastDialog[\s\S]*?onSave=\{handleSaveNgCast\}[\s\S]*?\) : null\}/
    )
  })

  it('uses the persisted point adjustment dialog instead of a discarded legacy input', () => {
    expect(source).toContain('<PointAdjustmentDialog')
    expect(source).not.toContain('pointsInputEnabled')
    expect(source).not.toContain('pointsToAdd')
    expect(source).not.toContain('pointsAmount')
    expect(source).not.toContain('ポイントを追加する')
    expect(source).toMatch(
      /buildStoreScopedEndpoint\(\s*`\/api\/customer\/points\?customerId=[\s\S]*?`,\s*currentStore\.id\s*\)/u
    )
  })

  it('keeps a name-only customer birth date unset until staff supplies it', () => {
    expect(source).toContain(".or(z.literal(''))")
    expect(source).toContain('birthDate: z.date().optional()')
    expect(source).toContain(
      'data.birthDate && data.birthDate.getTime() !== customer.birthDate?.getTime()'
    )
    expect(source).toContain("field.value ? field.value.toLocaleDateString('ja-JP') : '未登録'")
  })

  it('sends NG mutations through the selected store scope', () => {
    expect(source).toMatch(
      /fetch\(\s*buildStoreScopedEndpoint\('\/api\/customer\/ng', currentStore\.id\),\s*\{\s*method: 'POST'/
    )
    expect(source).toMatch(
      /fetch\(\s*`\$\{buildStoreScopedEndpoint\('\/api\/customer\/ng', currentStore\.id\)\}&customerId=\$\{encodeURIComponent\(customer\.id\)\}&castId=\$\{encodeURIComponent\(castId\)\}`/
    )
  })

  it('opens usage history by reservation id instead of matching only the date', () => {
    expect(source).toMatch(
      /findCustomerReservationByUsageRecordId\(\s*customer\.reservations \?\? \[\],\s*record\.id\s*\)/
    )
    expect(source).not.toContain('r.startTime.toDateString() === record.date.toDateString()')
  })
})
