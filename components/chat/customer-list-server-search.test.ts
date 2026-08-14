/**
 * @design_doc   Large migrated customer ledgers require bounded server-side chat search
 * @related_to   CustomerList and /api/chat/customers
 * @known_issues Source contract complements the route behavior tests
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(join(__dirname, 'customer-list.tsx'), 'utf8')

describe('CustomerList server search contract', () => {
  it('queries the bounded API instead of rendering every migrated customer', () => {
    expect(source).toContain("params.set('query', searchQuery.trim())")
    expect(source).toContain("params.set('limit', '50')")
    expect(source).toContain('setTimeout')
    expect(source).not.toContain('const filteredCustomers = customers.filter')
  })
})
