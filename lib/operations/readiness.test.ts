/**
 * @design_doc   docs/VPS_DEPLOYMENT.md production readiness contract
 * @related_to   readiness.ts, app/api/health/route.ts
 * @known_issues Third-party providers are configuration-checked; delivery is verified separately
 */
import { describe, expect, it, vi } from 'vitest'
import { db } from '@/lib/db'
import {
  getOperationalReadiness,
  probeDatabase,
  probePreviewDatabaseIdentity,
  probeWritableStorage,
} from './readiness'

vi.mock('@/lib/db', () => ({
  db: {
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
  },
}))

const readyConfig: NonNullable<
  NonNullable<Parameters<typeof getOperationalReadiness>[0]>['config']
> = {
  storage: { root: '/srv/salon-storage', publicBaseUrl: 'https://salon.example.com/uploads' },
  line: {
    messaging: {
      enabled: true,
      channelAccessToken: 'line-access-token',
      channelSecret: 'line-channel-secret',
    },
  },
}

function createDependencies() {
  return {
    config: readyConfig,
    databaseProbe: vi.fn().mockResolvedValue(undefined),
    previewDatabaseIdentityProbe: vi.fn().mockResolvedValue(undefined),
    storageProbe: vi.fn().mockResolvedValue(undefined),
    notificationProbe: vi.fn().mockReturnValue({ ready: true }),
  }
}

describe('getOperationalReadiness', () => {
  it('reports only status values when every required dependency is ready', async () => {
    const dependencies = createDependencies()

    const result = await getOperationalReadiness(dependencies)

    expect(result).toEqual({
      ready: true,
      checks: {
        database: 'ready',
        storage: 'ready',
        notifications: 'ready',
        line: 'ready',
      },
    })
    expect(dependencies.databaseProbe).toHaveBeenCalledOnce()
    expect(dependencies.storageProbe).toHaveBeenCalledWith('/srv/salon-storage')
  })

  it.each([
    ['database', 'databaseProbe'],
    ['storage', 'storageProbe'],
  ] as const)('fails closed when the %s probe rejects', async (check, dependencyName) => {
    const dependencies = createDependencies()
    dependencies[dependencyName].mockRejectedValueOnce(new Error('private failure detail'))

    const result = await getOperationalReadiness(dependencies)

    expect(result.ready).toBe(false)
    expect(result.checks[check]).toBe('not_ready')
    expect(JSON.stringify(result)).not.toContain('private failure detail')
  })

  it('fails closed when required notifications are unconfigured', async () => {
    const dependencies = createDependencies()
    dependencies.notificationProbe.mockReturnValueOnce({ ready: false })

    const result = await getOperationalReadiness(dependencies)

    expect(result.ready).toBe(false)
    expect(result.checks.notifications).toBe('not_ready')
  })

  it.each([
    ['line access token', '', 'line-channel-secret'],
    ['line channel secret', 'line-access-token', ''],
  ])('fails closed when enabled LINE messaging lacks its %s', async (_, token, secret) => {
    const dependencies = createDependencies()
    dependencies.config = {
      ...readyConfig,
      line: {
        messaging: {
          enabled: true,
          channelAccessToken: token,
          channelSecret: secret,
        },
      },
    }

    const result = await getOperationalReadiness(dependencies)

    expect(result.ready).toBe(false)
    expect(result.checks.line).toBe('not_ready')
  })

  it('fails closed when checking notification configuration throws', async () => {
    const dependencies = createDependencies()
    dependencies.notificationProbe.mockImplementationOnce(() => {
      throw new Error('private notification failure')
    })

    const result = await getOperationalReadiness(dependencies)

    expect(result.ready).toBe(false)
    expect(result.checks.notifications).toBe('not_ready')
    expect(JSON.stringify(result)).not.toContain('private notification failure')
  })

  it('marks intentionally disabled LINE messaging as disabled and ready', async () => {
    const dependencies = createDependencies()
    dependencies.config = {
      ...readyConfig,
      line: {
        messaging: {
          enabled: false,
          channelAccessToken: '',
          channelSecret: '',
        },
      },
    }

    const result = await getOperationalReadiness(dependencies)

    expect(result.ready).toBe(true)
    expect(result.checks.line).toBe('disabled')
  })

  it('requires the database-side environment and target marker in preview mode', async () => {
    const dependencies = createDependencies()
    dependencies.config = {
      ...readyConfig,
      runtimeMode: 'preview',
      preview: { targetId: '01JZ8QFQ05J6JNRQY3YW7M0V55' },
    }

    const result = await getOperationalReadiness(dependencies)

    expect(result.ready).toBe(true)
    expect(dependencies.previewDatabaseIdentityProbe).toHaveBeenCalledWith(
      '01JZ8QFQ05J6JNRQY3YW7M0V55'
    )
  })

  it('fails database readiness when the preview database identity does not match', async () => {
    const dependencies = createDependencies()
    dependencies.config = {
      ...readyConfig,
      runtimeMode: 'preview',
      preview: { targetId: '01JZ8QFQ05J6JNRQY3YW7M0V55' },
    }
    dependencies.previewDatabaseIdentityProbe.mockRejectedValueOnce(
      new Error('private database marker mismatch')
    )

    const result = await getOperationalReadiness(dependencies)

    expect(result.ready).toBe(false)
    expect(result.checks.database).toBe('not_ready')
    expect(JSON.stringify(result)).not.toContain('private database marker mismatch')
  })
})

describe('probeDatabase', () => {
  it('executes only a constant lightweight SELECT 1 query', async () => {
    await probeDatabase()

    expect(db.$queryRaw).toHaveBeenCalledOnce()
    const [query] = vi.mocked(db.$queryRaw).mock.calls[0]
    expect(Array.from(query as TemplateStringsArray)).toEqual(['SELECT 1'])
  })
})

describe('probePreviewDatabaseIdentity', () => {
  it('accepts only the exact database-side preview environment and target marker', async () => {
    vi.mocked(db.$queryRaw).mockResolvedValueOnce([
      { environment: 'staging-preview', targetId: '01JZ8QFQ05J6JNRQY3YW7M0V55' },
    ])

    await expect(
      probePreviewDatabaseIdentity('01JZ8QFQ05J6JNRQY3YW7M0V55')
    ).resolves.toBeUndefined()
  })

  it.each([
    { rows: [] },
    {
      rows: [{ environment: 'production', targetId: '01JZ8QFQ05J6JNRQY3YW7M0V55' }],
    },
    {
      rows: [{ environment: 'staging-preview', targetId: 'different-target-marker' }],
    },
  ])('rejects a missing or mismatched database identity', async ({ rows }) => {
    vi.mocked(db.$queryRaw).mockResolvedValueOnce(rows)

    await expect(probePreviewDatabaseIdentity('01JZ8QFQ05J6JNRQY3YW7M0V55')).rejects.toThrow(
      'Preview database identity mismatch'
    )
  })
})

describe('probeWritableStorage', () => {
  it('uses an exclusive zero-byte write and removes the probe after success', async () => {
    const io = {
      stat: vi.fn().mockResolvedValue({ isDirectory: () => true }),
      writeFile: vi.fn().mockResolvedValue(undefined),
      unlink: vi.fn().mockResolvedValue(undefined),
      createProbeName: vi.fn().mockReturnValue('.salon-readiness-test'),
    }

    await probeWritableStorage('/srv/salon-storage', io)

    expect(io.writeFile).toHaveBeenCalledWith('/srv/salon-storage/.salon-readiness-test', '', {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600,
    })
    expect(io.unlink).toHaveBeenCalledWith('/srv/salon-storage/.salon-readiness-test')
  })

  it('does not write when the configured root is not a directory', async () => {
    const io = {
      stat: vi.fn().mockResolvedValue({ isDirectory: () => false }),
      writeFile: vi.fn().mockResolvedValue(undefined),
      unlink: vi.fn().mockResolvedValue(undefined),
      createProbeName: vi.fn().mockReturnValue('.salon-readiness-test'),
    }

    await expect(probeWritableStorage('/srv/salon-storage', io)).rejects.toThrow('not a directory')
    expect(io.writeFile).not.toHaveBeenCalled()
    expect(io.unlink).not.toHaveBeenCalled()
  })

  it('does not attempt deletion when creating the probe fails', async () => {
    const io = {
      stat: vi.fn().mockResolvedValue({ isDirectory: () => true }),
      writeFile: vi.fn().mockRejectedValue(new Error('read only')),
      unlink: vi.fn().mockResolvedValue(undefined),
      createProbeName: vi.fn().mockReturnValue('.salon-readiness-test'),
    }

    await expect(probeWritableStorage('/srv/salon-storage', io)).rejects.toThrow('read only')
    expect(io.unlink).not.toHaveBeenCalled()
  })
})
