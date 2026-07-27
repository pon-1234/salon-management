/**
 * @design_doc   Bcrypt-safe customer password boundary shared by browser and server validation
 * @related_to   Customer registration, credential login, and password reset
 * @known_issues This enforces bcrypt input integrity, not a complete password-strength policy
 */
const BCRYPT_MAX_PASSWORD_BYTES = 72
const LINE_BREAK_PATTERN = /[\r\n]/

export function isBcryptSafePassword(password: string): boolean {
  return (
    !LINE_BREAK_PATTERN.test(password) &&
    new TextEncoder().encode(password).byteLength <= BCRYPT_MAX_PASSWORD_BYTES
  )
}
