/**
 * @design_doc   One-way storage policy for account-recovery and verification bearer tokens
 * @related_to   Password reset and email verification API routes
 * @known_issues Existing plaintext bearer tokens become invalid when this policy is deployed
 */
import { createHash } from 'node:crypto'

export function hashBearerToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function hashRecoveryToken(token: string): string {
  return hashBearerToken(token)
}
