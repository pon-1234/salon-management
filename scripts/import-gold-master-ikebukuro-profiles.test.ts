/**
 * @design_doc docs/verification/2026-09-05-notion-recheck.md
 * @related_to import-gold-master-ikebukuro-profiles - preview identity and retry guards
 * @known_issues Synthetic database boundary; live isolated restore is verified separately
 */
import { expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  assertProfileRefreshEnvironment,
  verifyProfileRefreshTarget,
  profileRefreshSourceKey,
} from './import-gold-master-ikebukuro-profiles'
const env = {
  APP_RUNTIME_MODE: 'preview',
  OUTBOUND_DELIVERY_MODE: 'disabled',
  DATABASE_URL: 'postgresql://user:secret@db:5432/salon_uat_preview',
  PREVIEW_TARGET_ID: 'preview-target-marker-20260905',
  NEXTAUTH_SECRET: 's'.repeat(32),
  STORAGE_ROOT: '/var/lib/salon-preview-storage',
}
it('ships the import command and media encryption dependencies in the runtime image', () => {
  const dockerfile = readFileSync('deploy/xserver-vps/Dockerfile', 'utf8')
  expect(dockerfile).toContain('COPY --from=builder /app/lib/settings ./lib/settings')
  expect(dockerfile).toContain(
    'COPY --from=builder /app/scripts/import-gold-master-ikebukuro-profiles.ts ./scripts/import-gold-master-ikebukuro-profiles.ts'
  )
})
it('rejects production targets, outbound delivery, and absent secret before importing', () => {
  expect(assertProfileRefreshEnvironment(env)).toMatchObject({ databaseName: 'salon_uat_preview' })
  for (const change of [
    { APP_RUNTIME_MODE: 'production' },
    { OUTBOUND_DELIVERY_MODE: 'live' },
    { DATABASE_URL: 'postgresql://user:secret@db:5432/production' },
    { NEXTAUTH_SECRET: '' },
  ])
    expect(() => assertProfileRefreshEnvironment({ ...env, ...change })).toThrow()
})
it('requires the database marker to match the approved preview', async () => {
  const query = vi.fn(async () => [
    { databaseName: 'salon_uat_preview', environment: 'production', marker: env.PREVIEW_TARGET_ID },
  ])
  await expect(
    verifyProfileRefreshTarget({ $queryRaw: query }, assertProfileRefreshEnvironment(env))
  ).rejects.toThrow()
  query.mockResolvedValue([
    {
      databaseName: 'salon_uat_preview',
      environment: 'staging-preview',
      marker: env.PREVIEW_TARGET_ID,
    },
  ])
  await expect(
    verifyProfileRefreshTarget({ $queryRaw: query }, assertProfileRefreshEnvironment(env))
  ).resolves.toBeUndefined()
})
it('binds retry identity to both the source snapshot and verified photo manifest', () => {
  expect(profileRefreshSourceKey('a', 'b')).toBe(profileRefreshSourceKey('a', 'b'))
  expect(profileRefreshSourceKey('a', 'b')).not.toBe(profileRefreshSourceKey('a', 'c'))
})
