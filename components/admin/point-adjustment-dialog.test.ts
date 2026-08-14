/**
 * @design_doc   Customer point adjustment store isolation
 * @related_to   point-adjustment-dialog.tsx, POST /api/customer/points/adjust
 * @known_issues None
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('PointAdjustmentDialog store scope', () => {
  it('sends the selected store with every manual adjustment', () => {
    const source = readFileSync(
      join(process.cwd(), 'components/admin/point-adjustment-dialog.tsx'),
      'utf8'
    )

    expect(source).toContain('const { currentStore } = useStore()')
    expect(source).toMatch(
      /fetch\(\s*buildStoreScopedEndpoint\('\/api\/customer\/points\/adjust', currentStore\.id\)/u
    )
  })
})
