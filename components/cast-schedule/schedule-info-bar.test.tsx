/**
 * @design_doc   Notion task #283 compact schedule overview
 * @related_to   ScheduleInfoBar and WeeklySchedulePage
 * @known_issues None
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('ScheduleInfoBar', () => {
  it('uses a compact data-driven summary without large nested cards', () => {
    const source = readFileSync(join(__dirname, 'schedule-info-bar.tsx'), 'utf8')
    expect(source).not.toContain('const onLeave = 14')
    expect(source).not.toContain("from '@/components/ui/card'")
    expect(source).toContain('flex-wrap')
  })
})
