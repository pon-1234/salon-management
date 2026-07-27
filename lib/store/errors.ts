/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md A-2 store resolution errors
 * @related_to   ensureStoreId and store-scoped API routes
 * @known_issues Store existence still requires the configured database
 */
export function isUnknownStoreError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith('Unknown store:')
}
