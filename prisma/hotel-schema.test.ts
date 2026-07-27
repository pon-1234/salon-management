/**
 * @design_doc   docs/HOTEL_DATA_MODEL.md
 * @related_to   HotelSettings; HotelServiceArea; HotelRate; Reservation
 * @known_issues Legacy price1..price4 semantics remain raw text until business meaning is confirmed
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('hotel persistence schema', () => {
  const schema = readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8')
  const migrationPath = join(
    process.cwd(),
    'prisma',
    'migrations',
    '20260721010000_normalize_hotel_management',
    'migration.sql'
  )

  it('keeps a hotel snapshot while linking reservations to a normalized hotel and expense', () => {
    const reservation = schema.match(/model Reservation \{[\s\S]*?\n\}/u)?.[0]

    expect(reservation).toBeDefined()
    expect(reservation).toMatch(/hotelId\s+String\?/)
    expect(reservation).toMatch(/hotelName\s+String\?/)
    expect(reservation).toMatch(/hotelExpense\s+Int\s+@default\(0\)/)
    expect(reservation).toMatch(
      /hotel\s+HotelSettings\?\s+@relation\(fields: \[hotelId, storeId\], references: \[id, storeId\], onDelete: Restrict\)/
    )
  })

  it('makes hotel masters store-scoped, logically deletable, ordered, and legacy compatible', () => {
    const hotel = schema.match(/model HotelSettings \{[\s\S]*?\n\}/u)?.[0]

    expect(hotel).toBeDefined()
    expect(hotel).toMatch(/storeId\s+String/)
    expect(hotel).toMatch(/legacyId\s+String\?/)
    expect(hotel).toMatch(/area\s+String\?/)
    expect(hotel).toMatch(/station\s+String\?/)
    expect(hotel).toMatch(/roomCount\s+Int\?/)
    expect(hotel).toMatch(/hourlyRate\s+Int\?/)
    expect(hotel).toMatch(/address\s+String\?/)
    expect(hotel).toMatch(/phone\s+String\?/)
    expect(hotel).toMatch(/checkInTime\s+String\?/)
    expect(hotel).toMatch(/checkOutTime\s+String\?/)
    expect(hotel).toMatch(/rawText\s+String\?/)
    expect(hotel).toMatch(/isActive\s+Boolean\s+@default\(true\)/)
    expect(hotel).toMatch(/displayOrder\s+Int\s+@default\(0\)/)
    expect(hotel).toContain('@@unique([id, storeId])')
    expect(hotel).toContain('@@unique([storeId, legacyId])')
  })

  it('normalizes service areas and preserves unresolved rate meaning as raw text', () => {
    const serviceArea = schema.match(/model HotelServiceArea \{[\s\S]*?\n\}/u)?.[0]
    const rate = schema.match(/model HotelRate \{[\s\S]*?\n\}/u)?.[0]

    expect(serviceArea).toBeDefined()
    expect(serviceArea).toMatch(/storeId\s+String/)
    expect(serviceArea).toMatch(/hotelId\s+String/)
    expect(serviceArea).toMatch(/areaId\s+String/)
    expect(serviceArea).toContain('@@unique([hotelId, areaId])')
    expect(serviceArea).toMatch(
      /area\s+AreaInfo\s+@relation\(fields: \[areaId, storeId\], references: \[id, storeId\], onDelete: Restrict\)/
    )
    expect(rate).toBeDefined()
    expect(rate).toMatch(/label\s+String\?/)
    expect(rate).toMatch(/durationMinutes\s+Int\?/)
    expect(rate).toMatch(/amount\s+Int\?/)
    expect(rate).toMatch(/rawText\s+String\?/)
  })

  it('migrates existing hotel rows only when their store can be assigned unambiguously', () => {
    const migration = readFileSync(migrationPath, 'utf8')

    expect(migration.trimStart()).toMatch(/^BEGIN;/)
    expect(migration).toContain('LOCK TABLE "HotelSettings" IN SHARE ROW EXCLUSIVE MODE')
    expect(migration).toContain('COUNT(*) FROM "Store"')
    expect(migration).toContain('cannot assign existing hotels to one store unambiguously')
    expect(migration).toContain('ALTER COLUMN "storeId" SET NOT NULL')
    expect(migration).toContain('CREATE TABLE "HotelServiceArea"')
    expect(migration).toContain('CREATE TABLE "HotelRate"')
    expect(migration).toContain('CONSTRAINT "HotelRate_amount_nonnegative_check"')
    expect(migration).toContain('CONSTRAINT "HotelRate_duration_positive_check"')
    expect(migration).toContain('CONSTRAINT "HotelRate_value_present_check"')
    expect(migration).toContain('CONSTRAINT "Reservation_hotelExpense_nonnegative_check"')
    expect(migration).toContain('ON DELETE RESTRICT ON UPDATE CASCADE')
    expect(migration.trimEnd()).toMatch(/COMMIT;$/)
    expect(migration).not.toMatch(/DELETE\s+FROM\s+"HotelSettings"/iu)
  })
})
