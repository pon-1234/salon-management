/**
 * @design_doc   docs/ROUTING_STRUCTURE.md secure LINE cast registration flow
 * @related_to   CastManagePage hosts the administrator issuance control
 * @known_issues The page remains covered by component and route tests rather than a full browser test
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(join(__dirname, 'page.tsx'), 'utf8')

describe('CastManagePage LINE registration integration', () => {
  it('mounts the secure issuance panel with cast and store scope', () => {
    expect(source).toContain('import { CastLineRegistrationPanel }')
    expect(source).toContain('<CastLineRegistrationPanel')
    expect(source).toContain('castId={cast.id}')
    expect(source).toContain('storeId={currentStore.id}')
    expect(source).toContain('isLinked={Boolean(cast.lineUserId)}')
  })

  it('opens an explicitly linked operational tab', () => {
    expect(source).toContain('useSearchParams')
    expect(source).toContain("searchParams.get('tab')")
    expect(source).toContain('value={activeTab}')
    expect(source).toContain('onValueChange={setActiveTab}')
  })
})
