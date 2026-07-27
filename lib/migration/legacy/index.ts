/**
 * @design_doc   Legacy migration manifest v1 public API
 * @related_to   manifest.ts validates configuration; transform.ts parses offline export rows
 * @known_issues Database reads and writes are intentionally excluded from this pure module
 */

export { assertLegacyMigrationManifest, validateLegacyMigrationManifest } from './manifest'
export { runLegacyMigrationDryRun } from './dry-run'
export { executeLegacyMigrationFileDryRun, parseLegacyMigrationCliArgs } from './file-runner'
export * from './image-manifest'
export * from './preview-image-filesystem'
export * from './preview-image-import'
export * from './preview-prepare'
export * from './preview-safety'
export * from './snapshot-package'
export { transformLegacyExport } from './transform'
export * from './types'
