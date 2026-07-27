/**
 * @design_doc   Password recovery tokens must be stored as one-way digests
 * @related_to   app/api/auth/forgot-password/route.ts, app/api/auth/reset-password/route.ts
 * @known_issues Token expiry and single-use consumption remain database-enforced by the routes
 */
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { hashBearerToken, hashRecoveryToken } from './recovery-token'

describe('hashRecoveryToken', () => {
  it('returns a deterministic SHA-256 digest instead of the bearer token', () => {
    const token = 'raw-password-reset-token'

    const digest = hashRecoveryToken(token)

    expect(digest).toBe(createHash('sha256').update(token).digest('hex'))
    expect(digest).not.toContain(token)
    expect(digest).toMatch(/^[a-f0-9]{64}$/)
    expect(hashBearerToken(token)).toBe(digest)
  })
})
