/**
 * @design_doc   docs/VPS_DEPLOYMENT.md
 * @related_to   Dockerfile - Builds the salon application for the Platinum VPS
 * @known_issues docs/VPS_DEPLOYMENT.md
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const deploymentDirectory = join(process.cwd(), 'deploy', 'xserver-vps')

describe('XServer VPS deployment artifacts', () => {
  it('builds Prisma for the runner OpenSSL ABI without runtime engine downloads', () => {
    const dockerfile = readFileSync(join(deploymentDirectory, 'Dockerfile'), 'utf8')
    const dependencyStage = dockerfile.slice(
      dockerfile.indexOf('FROM base AS dependencies'),
      dockerfile.indexOf('FROM dependencies AS builder')
    )

    expect(dockerfile.slice(0, dockerfile.indexOf('FROM base AS dependencies'))).toContain(
      'apt-get install -y --no-install-recommends openssl'
    )
    expect(dependencyStage).toContain('COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./')
    expect(
      dependencyStage.indexOf('COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./')
    ).toBeLessThan(dependencyStage.indexOf('pnpm install --frozen-lockfile'))
  })

  it('builds a standalone Next.js production image for the VPS', () => {
    const dockerfile = readFileSync(join(deploymentDirectory, 'Dockerfile'), 'utf8')

    expect(dockerfile).toContain('pnpm install --frozen-lockfile')
    expect(dockerfile).toContain('pnpm prisma generate')
    expect(dockerfile).toContain('pnpm build')
    expect(dockerfile).toContain('/app/.next/standalone')
    expect(dockerfile).toContain('HEALTHCHECK')
    expect(dockerfile).toContain('http://127.0.0.1:3000/api/health')
    expect(dockerfile).toContain('CMD ["node", "server.js"]')
  })

  it('uses non-secret builder-only placeholders for strict production configuration', () => {
    const dockerfile = readFileSync(join(deploymentDirectory, 'Dockerfile'), 'utf8')
    const runnerStage = dockerfile.slice(dockerfile.indexOf('FROM base AS runner'))

    expect(dockerfile).toContain('ENV NEXTAUTH_URL=https://build.invalid')
    expect(dockerfile).toContain('ENV STORAGE_ROOT=/tmp/salon-build-storage')
    expect(dockerfile).toContain('ENV STORAGE_PUBLIC_BASE_URL=https://build.invalid/salon-uploads')
    expect(runnerStage).not.toContain('build-time-placeholder')
    expect(runnerStage).not.toContain('build.invalid')
    expect(runnerStage).not.toContain('/tmp/salon-build-storage')
  })

  it('excludes private migration artifacts from every Docker build stage', () => {
    const dockerignore = readFileSync(join(process.cwd(), '.dockerignore'), 'utf8')

    expect(dockerignore).toMatch(/^\.env\*$/m)
    expect(dockerignore).toMatch(/^migration-data$/m)
  })

  it('packages the explicit admin bootstrap runner without starting it automatically', () => {
    const dockerfile = readFileSync(join(deploymentDirectory, 'Dockerfile'), 'utf8')
    const entrypoint = readFileSync(join(deploymentDirectory, 'entrypoint.sh'), 'utf8')

    expect(dockerfile).toContain('FROM base AS runner')
    expect(dockerfile).toContain('COPY --from=builder /app/lib/admin ./lib/admin')
    expect(dockerfile).toContain('COPY --from=builder /app/tsconfig.json ./tsconfig.json')
    expect(dockerfile).toContain(
      'COPY --from=builder /app/scripts/setup-admin.ts ./scripts/setup-admin.ts'
    )
    expect(dockerfile).not.toMatch(/^RUN .*setup:admin/m)
    expect(entrypoint).not.toContain('setup:admin')
    expect(entrypoint).not.toContain('setup-admin.ts')
  })

  it('packages the purpose-built preview UAT setup without running it automatically', () => {
    const dockerfile = readFileSync(join(deploymentDirectory, 'Dockerfile'), 'utf8')
    const entrypoint = readFileSync(join(deploymentDirectory, 'entrypoint.sh'), 'utf8')
    const packageJson = readFileSync(join(process.cwd(), 'package.json'), 'utf8')

    expect(packageJson).toContain('"setup:preview-uat": "tsx scripts/setup-preview-uat.ts"')
    expect(dockerfile).toContain('COPY --from=builder /app/lib/preview-uat ./lib/preview-uat')
    expect(dockerfile).toContain(
      'COPY --from=builder /app/scripts/setup-preview-uat.ts ./scripts/setup-preview-uat.ts'
    )
    expect(dockerfile).not.toMatch(/^RUN .*setup:preview-uat/m)
    expect(entrypoint).not.toContain('setup:preview-uat')
    expect(entrypoint).not.toContain('setup-preview-uat.ts')
  })

  it('packages the guarded Ikebukuro snapshot importer without running it automatically', () => {
    const dockerfile = readFileSync(join(deploymentDirectory, 'Dockerfile'), 'utf8')
    const entrypoint = readFileSync(join(deploymentDirectory, 'entrypoint.sh'), 'utf8')
    const packageJson = readFileSync(join(process.cwd(), 'package.json'), 'utf8')

    expect(packageJson).toContain(
      '"preview:import-ikebukuro": "tsx scripts/import-gold-master-ikebukuro-preview.ts"'
    )
    expect(dockerfile).toContain('COPY --from=builder /app/lib/migration ./lib/migration')
    expect(dockerfile).toContain(
      'COPY --from=builder /app/scripts/import-gold-master-ikebukuro-preview.ts ./scripts/import-gold-master-ikebukuro-preview.ts'
    )
    expect(dockerfile).not.toMatch(/^RUN .*preview:import-ikebukuro/m)
    expect(entrypoint).not.toContain('preview:import-ikebukuro')
    expect(entrypoint).not.toContain('import-gold-master-ikebukuro-preview.ts')
  })

  it('packages the non-writing V5 verifier without running it automatically', () => {
    const dockerfile = readFileSync(join(deploymentDirectory, 'Dockerfile'), 'utf8')
    const entrypoint = readFileSync(join(deploymentDirectory, 'entrypoint.sh'), 'utf8')
    const packageJson = readFileSync(join(process.cwd(), 'package.json'), 'utf8')

    expect(packageJson).toContain(
      '"preview:verify-ikebukuro": "tsx scripts/verify-gold-master-ikebukuro-preview.ts"'
    )
    expect(dockerfile).toContain(
      'COPY --from=builder /app/scripts/verify-gold-master-ikebukuro-preview.ts ./scripts/verify-gold-master-ikebukuro-preview.ts'
    )
    expect(dockerfile).not.toMatch(/^RUN .*preview:verify-ikebukuro/m)
    expect(entrypoint).not.toContain('preview:verify-ikebukuro')
    expect(entrypoint).not.toContain('verify-gold-master-ikebukuro-preview.ts')
  })

  it('documents secret-safe, empty-database preview UAT setup', () => {
    const checklist = readFileSync(join(process.cwd(), 'docs', 'PREVIEW_UAT_CHECKLIST.md'), 'utf8')

    expect(checklist).toContain('pnpm setup:preview-uat')
    expect(checklist).toContain('PREVIEW_UAT_ADMIN_PASSWORD')
    expect(checklist).toContain('PREVIEW_UAT_CUSTOMER_PASSWORD')
    expect(checklist).toContain('PREVIEW_UAT_CAST_PASSWORD')
    expect(checklist).toContain('CREATE_SYNTHETIC_UAT_DATA_IN_EMPTY_ISOLATED_PREVIEW')
    expect(checklist).toMatch(/旧本番.*接続しません/u)
    expect(checklist).toMatch(/完全に空/u)
  })

  it('documents an isolated write journey for field UAT without modifying copied customers', () => {
    const manual = readFileSync(
      join(process.cwd(), 'docs', 'IKEBUKURO_FIELD_UAT_MANUAL.md'),
      'utf8'
    )

    expect(manual).toContain('`[UAT]` 専用データだけ')
    expect(manual).toMatch(/`090`.*月日.*時分/u)
    expect(manual).not.toMatch(/`000`.*月日.*時分/u)
    expect(manual).toMatch(/新規顧客.*予約.*変更.*キャンセル/u)
    expect(manual).toMatch(/キャンセル理由/u)
    expect(manual).toMatch(/コピー済み.*変更・削除し(?:ない|ません)/u)
    expect(manual).toMatch(/LINE.*メール.*SMS.*Push.*決済/u)
  })

  it('documents secret-safe production bootstrap and overwrite acknowledgement', () => {
    const deploymentGuide = readFileSync(join(process.cwd(), 'docs', 'VPS_DEPLOYMENT.md'), 'utf8')

    expect(deploymentGuide).toContain('ADMIN_BOOTSTRAP_PASSWORD')
    expect(deploymentGuide).toContain('ADMIN_BOOTSTRAP_ROLE')
    expect(deploymentGuide).toContain('ADMIN_BOOTSTRAP_STORE_IDS')
    expect(deploymentGuide).toContain('ADMIN_BOOTSTRAP_PERMISSIONS')
    expect(deploymentGuide).toContain('ADMIN_BOOTSTRAP_ALLOW_EXISTING_UPDATE=true')
    expect(deploymentGuide).toContain('pnpm setup:admin')
    expect(deploymentGuide).toMatch(/not run automatically/i)
  })

  it('describes the VPS as the target runtime without claiming legacy cutover is complete', () => {
    const deploymentGuide = readFileSync(join(process.cwd(), 'docs', 'VPS_DEPLOYMENT.md'), 'utf8')

    expect(deploymentGuide).toMatch(/target production runtime/i)
    expect(deploymentGuide).toMatch(/legacy.*cutover.*No-Go/i)
    expect(deploymentGuide).not.toContain('deployed permanently')
    expect(deploymentGuide).toMatch(/optional migration from an earlier Salon deployment/i)
    expect(deploymentGuide).toMatch(/not.*gambit-front/i)
  })

  it('documents every fail-closed readiness dependency and its redacted response', () => {
    const deploymentGuide = readFileSync(join(process.cwd(), 'docs', 'VPS_DEPLOYMENT.md'), 'utf8')

    expect(deploymentGuide).toMatch(/database.*SELECT 1/i)
    expect(deploymentGuide).toMatch(/storage.*write.*delete/i)
    expect(deploymentGuide).toMatch(/LINE.*enabled/i)
    expect(deploymentGuide).toMatch(/status.*only/i)
  })

  it('requires the external Compose configuration to preserve the application readiness probe', () => {
    const deploymentGuide = readFileSync(join(process.cwd(), 'docs', 'VPS_DEPLOYMENT.md'), 'utf8')

    expect(deploymentGuide).toMatch(/resolved Compose/i)
    expect(deploymentGuide).toMatch(/override[^.]*\/api\/health/i)
    expect(deploymentGuide).toMatch(/compose[^.]*not[^.]*this repository/i)
  })

  it('documents and demonstrates the production NextAuth secret length requirement', () => {
    const deploymentGuide = readFileSync(join(process.cwd(), 'docs', 'VPS_DEPLOYMENT.md'), 'utf8')
    const environmentExample = readFileSync(join(process.cwd(), '.env.example'), 'utf8')

    expect(deploymentGuide).toMatch(/NEXTAUTH_SECRET[^.]*32 characters/i)
    expect(environmentExample).toContain(
      'NEXTAUTH_SECRET="replace-with-at-least-32-character-secret"'
    )
  })

  it('keeps the example storage root aligned with the mounted volume root', () => {
    const environmentExample = readFileSync(join(process.cwd(), '.env.example'), 'utf8')

    expect(environmentExample).toContain('STORAGE_ROOT="/var/lib/salon-storage"')
    expect(environmentExample).not.toContain('STORAGE_ROOT="/var/lib/salon-storage/images"')
  })

  it('provides a VPS entrypoint that applies migrations before starting', () => {
    const entrypoint = readFileSync(join(deploymentDirectory, 'entrypoint.sh'), 'utf8')

    expect(entrypoint).toContain('prisma migrate deploy')
    expect(entrypoint).toContain('exec "$@"')
  })

  it('starts cron without racing the application database migration', () => {
    const cronEntrypoint = readFileSync(join(deploymentDirectory, 'cron-entrypoint.sh'), 'utf8')

    expect(cronEntrypoint).not.toContain('prisma migrate deploy')
    expect(cronEntrypoint).toContain('exec cron -f')
  })

  it('does not register automatic chat attachment deletion', () => {
    const cronEntrypoint = readFileSync(join(deploymentDirectory, 'cron-entrypoint.sh'), 'utf8')

    expect(cronEntrypoint).not.toContain('scripts/prune-chat-attachments.ts')
  })

  it('does not register automatic point expiration before FIFO reconciliation is approved', () => {
    const cronEntrypoint = readFileSync(join(deploymentDirectory, 'cron-entrypoint.sh'), 'utf8')
    const githubWorkflow = readFileSync(
      join(process.cwd(), '.github', 'workflows', 'expire-points.yml'),
      'utf8'
    )

    expect(cronEntrypoint).not.toContain('/api/customer/points/expire')
    expect(githubWorkflow).toContain('on: []')
    expect(githubWorkflow).not.toContain('/api/customer/points/expire')
    expect(githubWorkflow).not.toContain('POINT_EXPIRY_ENDPOINT')
  })

  it('documents the point-expiration fail-closed prerequisites', () => {
    const deploymentGuide = readFileSync(join(process.cwd(), 'docs', 'VPS_DEPLOYMENT.md'), 'utf8')

    expect(deploymentGuide).toContain('FIFO')
    expect(deploymentGuide).toContain('ロット配賦')
    expect(deploymentGuide).toContain('移行')
    expect(deploymentGuide).toContain('照合')
    expect(deploymentGuide).toMatch(/手動.*自動.*無効/)
  })
})
