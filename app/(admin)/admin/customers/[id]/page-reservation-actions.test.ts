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
    expect(source).toContain('href={`tel:${normalizePhoneQuery(customer.phone)}`}')
  })

  it('persists dialog updates and reloads the customer reservation snapshot', () => {
    expect(source).toContain('const handleReservationSave = async (')
    expect(source).toContain('await reservationRepository.update(reservationId, { ...payload })')
    expect(source).toContain('await reloadCustomerReservations()')
    expect(source).toMatch(/<ReservationDialog[\s\S]*?onSave=\{handleReservationSave\}/)
  })

  it('opens usage history by reservation id instead of matching only the date', () => {
    expect(source).toMatch(
      /findCustomerReservationByUsageRecordId\(\s*customer\.reservations \?\? \[\],\s*record\.id\s*\)/
    )
    expect(source).not.toContain('r.startTime.toDateString() === record.date.toDateString()')
  })
})
