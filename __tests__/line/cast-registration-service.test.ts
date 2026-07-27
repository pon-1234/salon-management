/**
 * @design_doc   One-time LINE cast registration token security contract
 * @related_to   lib/line/cast-registration-service.ts, CastLineRegistrationToken model
 * @known_issues None
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  LineCastRegistrationService,
  extractRegistrationTokenFromCommand,
  hashLineRegistrationToken,
} from '@/lib/line/cast-registration-service'
import logger from '@/lib/logger'

vi.mock('@/lib/logger', () => ({
  default: { error: vi.fn() },
}))

const RAW_TOKEN = 'A'.repeat(43)

type CastRecord = {
  id: string
  name: string
  storeId: string
  lineUserId: string | null
}

type TokenRecord = {
  id: string
  castId: string
  storeId: string
  tokenHash: string
  expiresAt: Date
  usedAt: Date | null
}

function matchesWhere<T extends Record<string, unknown>>(record: T, where: Record<string, any>) {
  return Object.entries(where).every(([key, expected]) => {
    if (key === 'NOT') {
      return !matchesWhere(record, expected)
    }
    if (expected && typeof expected === 'object' && 'gt' in expected) {
      return record[key] instanceof Date && record[key] > expected.gt
    }
    return record[key] === expected
  })
}

class TransactionalRegistrationDatabase {
  public casts: CastRecord[]
  public tokens: TokenRecord[]
  public transactionOptions: unknown
  public tokenUpdateCountOverride: number | null = null
  public castUpdateCountOverride: number | null = null

  constructor(casts: CastRecord[], tokens: TokenRecord[]) {
    this.casts = structuredClone(casts)
    this.tokens = structuredClone(tokens)
  }

  async $transaction<T>(callback: (transaction: any) => Promise<T>, options?: unknown): Promise<T> {
    this.transactionOptions = options
    const castSnapshot = structuredClone(this.casts)
    const tokenSnapshot = structuredClone(this.tokens)

    const transaction = {
      castLineRegistrationToken: {
        findUnique: vi.fn(async ({ where }: { where: { tokenHash: string } }) =>
          this.tokens.find((token) => token.tokenHash === where.tokenHash)
        ),
        updateMany: vi.fn(
          async ({ where, data }: { where: Record<string, any>; data: { usedAt: Date } }) => {
            if (this.tokenUpdateCountOverride !== null) {
              return { count: this.tokenUpdateCountOverride }
            }
            const token = this.tokens.find((candidate) => matchesWhere(candidate, where))
            if (!token) return { count: 0 }
            token.usedAt = data.usedAt
            return { count: 1 }
          }
        ),
      },
      cast: {
        findFirst: vi.fn(async ({ where }: { where: Record<string, any> }) =>
          this.casts.find((cast) => matchesWhere(cast, where))
        ),
        updateMany: vi.fn(
          async ({ where, data }: { where: Record<string, any>; data: { lineUserId: string } }) => {
            if (this.castUpdateCountOverride !== null) {
              return { count: this.castUpdateCountOverride }
            }
            const cast = this.casts.find((candidate) => matchesWhere(candidate, where))
            if (!cast) return { count: 0 }
            if (
              this.casts.some(
                (candidate) => candidate.id !== cast.id && candidate.lineUserId === data.lineUserId
              )
            ) {
              throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })
            }
            cast.lineUserId = data.lineUserId
            return { count: 1 }
          }
        ),
      },
    }

    try {
      return await callback(transaction)
    } catch (error) {
      this.casts = castSnapshot
      this.tokens = tokenSnapshot
      throw error
    }
  }
}

class MockLineMessagingClient {
  public messages: Array<{ to: string; text: string }> = []

  isConfigured() {
    return true
  }

  async pushText(to: string, text: string) {
    this.messages.push({ to, text })
  }
}

describe('extractRegistrationTokenFromCommand', () => {
  it('accepts only reg followed by a 256-bit base64url token', () => {
    expect(extractRegistrationTokenFromCommand(`reg ${RAW_TOKEN}`)).toBe(RAW_TOKEN)
    expect(extractRegistrationTokenFromCommand(`register ${RAW_TOKEN}`)).toBeNull()
    expect(extractRegistrationTokenFromCommand(`link ${RAW_TOKEN}`)).toBeNull()
  })

  it('rejects a public cast ID instead of treating it as a credential', () => {
    expect(extractRegistrationTokenFromCommand('reg cmgufq9rz000dhh6ynwqtybix')).toBeNull()
  })
})

describe('LineCastRegistrationService', () => {
  let database: TransactionalRegistrationDatabase
  let messagingClient: MockLineMessagingClient
  let service: LineCastRegistrationService

  function createService(
    casts: CastRecord[] = [
      { id: 'cast-1', name: 'Alice', storeId: 'store-a', lineUserId: null },
      { id: 'cast-2', name: 'Beth', storeId: 'store-a', lineUserId: 'U-old' },
    ],
    token: Partial<TokenRecord> = {}
  ) {
    database = new TransactionalRegistrationDatabase(casts, [
      {
        id: 'token-1',
        castId: 'cast-1',
        storeId: 'store-a',
        tokenHash: hashLineRegistrationToken(RAW_TOKEN),
        expiresAt: new Date('2030-01-01T00:15:00.000Z'),
        usedAt: null,
        ...token,
      },
    ])
    messagingClient = new MockLineMessagingClient()
    service = new LineCastRegistrationService({
      database: database as any,
      messagingClient,
      now: () => new Date('2030-01-01T00:00:00.000Z'),
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    createService()
  })

  it('links the cast and consumes the token atomically', async () => {
    const result = await service.handleEvent({
      type: 'message',
      message: { type: 'text', text: `reg ${RAW_TOKEN}` },
      source: { type: 'user', userId: 'U-new' },
    })

    expect(result).toMatchObject({ status: 'linked', castId: 'cast-1', lineUserId: 'U-new' })
    expect(database.casts.find((cast) => cast.id === 'cast-1')?.lineUserId).toBe('U-new')
    expect(database.tokens[0].usedAt).toEqual(new Date('2030-01-01T00:00:00.000Z'))
    expect(database.transactionOptions).toEqual({ isolationLevel: 'Serializable' })
    expect(messagingClient.messages[0].text).toContain('LINE連携が完了しました。')
  })

  it('does not accept the former public cast ID command', async () => {
    const result = await service.handleEvent({
      type: 'message',
      message: { type: 'text', text: 'reg cast-1' },
      source: { type: 'user', userId: 'U-attacker' },
    })

    expect(result).toMatchObject({ status: 'ignored', reason: 'unrecognized_command' })
    expect(database.casts.find((cast) => cast.id === 'cast-1')?.lineUserId).toBeNull()
    expect(database.tokens[0].usedAt).toBeNull()
  })

  it.each([
    ['expired', { expiresAt: new Date('2029-12-31T23:59:59.000Z') }],
    ['already used', { usedAt: new Date('2029-12-31T23:00:00.000Z') }],
  ])('rejects an %s token without changing the cast', async (_label, token) => {
    createService(undefined, token)

    const result = await service.handleEvent({
      type: 'message',
      message: { type: 'text', text: `reg ${RAW_TOKEN}` },
      source: { type: 'user', userId: 'U-new' },
    })

    expect(result.status).toBe('invalid_token')
    expect(database.casts.find((cast) => cast.id === 'cast-1')?.lineUserId).toBeNull()
  })

  it('rejects overwriting a cast already linked to a different LINE user', async () => {
    createService([{ id: 'cast-1', name: 'Alice', storeId: 'store-a', lineUserId: 'U-victim' }])

    const result = await service.handleEvent({
      type: 'message',
      message: { type: 'text', text: `reg ${RAW_TOKEN}` },
      source: { type: 'user', userId: 'U-attacker' },
    })

    expect(result.status).toBe('conflict')
    expect(database.casts[0].lineUserId).toBe('U-victim')
    expect(database.tokens[0].usedAt).toBeNull()
  })

  it('rejects a LINE user already linked to another cast', async () => {
    const result = await service.handleEvent({
      type: 'message',
      message: { type: 'text', text: `reg ${RAW_TOKEN}` },
      source: { type: 'user', userId: 'U-old' },
    })

    expect(result.status).toBe('conflict')
    expect(database.casts.find((cast) => cast.id === 'cast-1')?.lineUserId).toBeNull()
    expect(database.tokens[0].usedAt).toBeNull()
  })

  it('rolls back token consumption when another request wins the cast update race', async () => {
    database.castUpdateCountOverride = 0

    const result = await service.handleEvent({
      type: 'message',
      message: { type: 'text', text: `reg ${RAW_TOKEN}` },
      source: { type: 'user', userId: 'U-new' },
    })

    expect(result.status).toBe('conflict')
    expect(database.tokens[0].usedAt).toBeNull()
  })

  it('rejects a concurrent second consumption when the conditional token claim loses', async () => {
    database.tokenUpdateCountOverride = 0

    const result = await service.handleEvent({
      type: 'message',
      message: { type: 'text', text: `reg ${RAW_TOKEN}` },
      source: { type: 'user', userId: 'U-new' },
    })

    expect(result.status).toBe('invalid_token')
    expect(database.casts.find((cast) => cast.id === 'cast-1')?.lineUserId).toBeNull()
  })

  it('sends token-based instructions on follow and never advertises cast IDs', async () => {
    const result = await service.handleEvent({
      type: 'follow',
      source: { type: 'user', userId: 'U-follow' },
    })

    expect(result.status).toBe('acknowledged')
    expect(messagingClient.messages[0].text).toContain('reg <招待トークン>')
    expect(messagingClient.messages[0].text).not.toContain('キャストID')
  })

  it('rejects registration postbacks so only the token text command can link', async () => {
    const result = await service.handleEvent({
      type: 'postback',
      postback: { data: 'action=register&castId=cast-1' },
      source: { type: 'user', userId: 'U-attacker' },
    })

    expect(result).toMatchObject({ status: 'ignored', reason: 'unrecognized_command' })
    expect(database.casts.find((cast) => cast.id === 'cast-1')?.lineUserId).toBeNull()
  })

  it('does not write the LINE user identifier into failure logs', async () => {
    service = new LineCastRegistrationService({
      database: { $transaction: vi.fn().mockRejectedValue(new Error('database unavailable')) },
      messagingClient,
    })

    const result = await service.handleEvent({
      type: 'message',
      message: { type: 'text', text: `reg ${RAW_TOKEN}` },
      source: { type: 'user', userId: 'U-sensitive-user' },
    })

    expect(result.status).toBe('error')
    expect(logger.error).toHaveBeenCalledWith(
      { err: expect.any(Error) },
      'Failed to link LINE user ID to cast'
    )
    expect(JSON.stringify(vi.mocked(logger.error).mock.calls)).not.toContain('U-sensitive-user')
  })
})
