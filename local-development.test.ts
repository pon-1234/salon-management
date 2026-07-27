/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md A-1 and H
 * @related_to   docker-compose.yml, .env.example, README.md, and package.json
 * @known_issues Production orchestration remains owned by platinum-management
 */
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('local development repository contract', () => {
  it('provides a persistent, health-checked local PostgreSQL service', () => {
    const compose = readFileSync('docker-compose.yml', 'utf8')

    expect(compose).toContain('postgres:16')
    expect(compose).toContain('pg_isready')
    expect(compose).toContain('salon_management')
    expect(compose).toContain('5432:5432')
    expect(compose).toMatch(/volumes:\s*\n(?:.|\n)*postgres_data:/)
  })

  it('documents one canonical local environment and database bootstrap flow', () => {
    const example = readFileSync('.env.example', 'utf8')
    const readme = readFileSync('README.md', 'utf8')

    expect(example).toContain(
      'DATABASE_URL="postgresql://salon:salon_local_password@localhost:5432/salon_management"'
    )
    expect(example).toContain(
      'DIRECT_URL="postgresql://salon:salon_local_password@localhost:5432/salon_management"'
    )
    expect(readme).toContain('docker compose up -d postgres')
    expect(readme).toContain('pnpm prisma migrate deploy')
    expect(existsSync('env.example')).toBe(false)
  })

  it('uses pnpm-only repository metadata and ignores generated audit output', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
    const gitignore = readFileSync('.gitignore', 'utf8')

    expect(packageJson.name).toBe('salon-management')
    expect(existsSync('package-lock.json')).toBe(false)
    expect(gitignore).toMatch(/^\/output\/$/m)
  })
})
