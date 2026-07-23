/**
 * @design_doc   docs/VPS_DEPLOYMENT.md
 * @related_to   Prisma development seeds and database initialization scripts
 * @known_issues None
 */

const DEVELOPMENT_DATABASE_ENVIRONMENTS = new Set(['development', 'test'])

/**
 * Stops development-only database mutation scripts unless NODE_ENV explicitly identifies a safe
 * local or test runtime.
 *
 * @param {string} operation Human-readable operation name for the error message.
 * @param {string | undefined} [nodeEnv] Runtime environment override for tests.
 */
function assertDevelopmentDatabaseMutation(operation, nodeEnv) {
  const effectiveEnvironment = arguments.length >= 2 ? nodeEnv : process.env.NODE_ENV
  const normalizedEnvironment = effectiveEnvironment?.trim().toLowerCase()

  if (normalizedEnvironment && DEVELOPMENT_DATABASE_ENVIRONMENTS.has(normalizedEnvironment)) {
    return
  }

  const environmentLabel = normalizedEnvironment || '(unset)'

  throw new Error(
    `[database safety] Development/test-only operation blocked: ${operation} is disabled when NODE_ENV=${environmentLabel}. Use prisma migrate deploy or a purpose-built production operation.`
  )
}

module.exports = {
  assertDevelopmentDatabaseMutation,
}
