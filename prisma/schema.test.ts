/**
 * @design_doc   Not available
 * @related_to   Prisma schema validation
 * @known_issues Not available
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Prisma schema', () => {
  const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma')
  let schemaContent: string

  beforeEach(() => {
    schemaContent = readFileSync(schemaPath, 'utf-8')
  })

  it('should have Cast model defined', () => {
    expect(schemaContent).toContain('model Cast {')
  })

  it('should have Customer model defined', () => {
    expect(schemaContent).toContain('model Customer {')
  })

  it('should have Reservation model defined', () => {
    expect(schemaContent).toContain('model Reservation {')
  })

  it('should have CoursePrice model defined', () => {
    expect(schemaContent).toContain('model CoursePrice {')
  })

  it('should have OptionPrice model defined', () => {
    expect(schemaContent).toContain('model OptionPrice {')
  })

  it('should have Review model defined', () => {
    expect(schemaContent).toContain('model Review {')
  })

  it('should have proper database provider', () => {
    expect(schemaContent).toContain('provider = "postgresql"')
  })
})
