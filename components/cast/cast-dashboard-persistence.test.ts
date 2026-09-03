/**
 * @design_doc   Client operational review: cast dashboard actions must persist real data
 * @related_to   CastDashboard and CastManagePage
 * @known_issues Source contract complements repository and reservation API tests
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const dashboardSource = readFileSync(join(__dirname, 'cast-dashboard.tsx'), 'utf8')
const managePageSource = readFileSync(
  join(process.cwd(), 'app', '(admin)', 'admin', 'cast', 'manage', '[id]', 'page.tsx'),
  'utf8'
)

describe('cast dashboard persistence contract', () => {
  it('routes profile editing to the persisted edit form and never shows invented contact data', () => {
    expect(dashboardSource).toContain('onRequestEdit')
    expect(managePageSource).toContain("onRequestEdit={() => setActiveTab('edit')}")
    expect(managePageSource).toContain('onUpdate={(data) => void handleSubmit(data)}')
    expect(dashboardSource).not.toContain('090-1234-5678')
    expect(dashboardSource).not.toContain('cast@example.com')
    expect(dashboardSource).not.toContain('name="phone"')
  })

  it('persists reservation dialog changes from the cast dashboard', () => {
    expect(dashboardSource).toContain('new ReservationRepositoryImpl')
    expect(dashboardSource).toContain('const handleReservationSave = useCallback')
    expect(dashboardSource).toContain('onSave={handleReservationSave}')
  })

  it('loads every upcoming active reservation page for the selected cast', () => {
    expect(dashboardSource).toContain('limit: 100')
    expect(dashboardSource).toContain('offset')
    expect(dashboardSource).toContain("status: 'active'")
    expect(dashboardSource).toContain('castId: cast.id')
    expect(dashboardSource).toContain('while (page.length === pageSize)')
  })

  it('uses the same schedule editor and batch payload as the weekly schedule page', () => {
    expect(dashboardSource).toContain("from '@/components/cast-schedule/schedule-edit-dialog'")
    expect(dashboardSource).toContain("from '@/lib/cast-schedule/batch-payload'")
    expect(dashboardSource).toContain("'/api/cast-schedule/batch'")
    expect(dashboardSource).not.toContain("from '@/components/cast/schedule-edit-dialog'")
  })
})
