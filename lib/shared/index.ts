/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md D-2 shared entrypoint cleanup
 * @related_to   Domain repositories, use cases, and currency presentation
 * @known_issues New exports must have a concrete external consumer
 */
export type { BaseEntity, Repository } from './types'
export { BaseUseCasesImpl } from './base-usecases'
export { formatCurrency, formatYen, generateId } from './utils'
