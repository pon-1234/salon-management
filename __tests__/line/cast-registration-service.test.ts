import { describe, expect, it, beforeEach } from 'vitest'
import {
  LineCastRegistrationService,
  extractCastIdFromCommand,
  extractCastIdFromPostback,
} from '@/lib/line/cast-registration-service'
import type { CastRegistrationResult } from '@/lib/line/cast-registration-service'

type CastRecord = {
  id: string
  name: string
  lineUserId: string | null
}

class MockCastRepository {
  constructor(private casts: Map<string, CastRecord>) {}

  static withCasts(records: CastRecord[]) {
    return new MockCastRepository(
      new Map(records.map((record) => [record.id, { ...record }]))
    )
  }

  async findUnique({
    where,
    select,
  }: {
    where: { id: string }
    select: Record<string, boolean>
  }) {
    const cast = this.casts.get(where.id)
    return cast ? this.pick(cast, select) : null
  }

  async findFirst({
    where,
    select,
  }: {
    where: { lineUserId?: string; NOT?: { id?: string } }
    select: Record<string, boolean>
  }) {
    for (const cast of this.casts.values()) {
      if (
        where.lineUserId !== undefined &&
        cast.lineUserId !== where.lineUserId
      ) {
        continue
      }
      if (where.NOT?.id && cast.id === where.NOT.id) {
        continue
      }
      return this.pick(cast, select)
    }
    return null
  }

  async update({
    where,
    data,
    select,
  }: {
    where: { id: string }
    data: { lineUserId: string }
    select: Record<string, boolean>
  }) {
    const cast = this.casts.get(where.id)
    if (!cast) {
      throw new Error('Cast not found')
    }
    cast.lineUserId = data.lineUserId
    return this.pick(cast, select)
  }

  private pick(record: CastRecord, select: Record<string, boolean>) {
    return Object.fromEntries(
      Object.entries(select)
        .filter(([, enabled]) => enabled)
        .map(([key]) => [key, (record as Record<string, unknown>)[key]])
    )
  }
}

class MockLineMessagingClient {
  public messages: Array<{ to: string; text: string }> = []
  public enabled = true

  isConfigured() {
    return this.enabled
  }

  async pushText(to: string, text: string) {
    this.messages.push({ to, text })
  }
}

describe('extractCastIdFromCommand', () => {
  it('parses valid reg command', () => {
    expect(extractCastIdFromCommand('reg cmgufq9rz000dhh6ynwqtybix')).toBe(
      'cmgufq9rz000dhh6ynwqtybix'
    )
  })

  it('returns null for invalid command', () => {
    expect(extractCastIdFromCommand('hello')).toBeNull()
    expect(extractCastIdFromCommand('reg')).toBeNull()
  })
})

describe('extractCastIdFromPostback', () => {
  it('parses castId from postback data', () => {
    expect(extractCastIdFromPostback('action=register&castId=cast-123')).toBe('cast-123')
    expect(extractCastIdFromPostback('castId=cast-456&action=register')).toBe('cast-456')
  })

  it('returns null when castId is missing', () => {
    expect(extractCastIdFromPostback('action=other')).toBeNull()
    expect(extractCastIdFromPostback('')).toBeNull()
    expect(extractCastIdFromPostback(null)).toBeNull()
  })
})

describe('LineCastRegistrationService', () => {
  let repository: MockCastRepository
  let messagingClient: MockLineMessagingClient
  let service: LineCastRegistrationService

  function createService(initialCasts: CastRecord[]) {
    repository = MockCastRepository.withCasts(initialCasts)
    messagingClient = new MockLineMessagingClient()
    service = new LineCastRegistrationService({
      castRepository: repository as unknown as any,
      messagingClient,
    })
  }

  beforeEach(() => {
    createService([
      { id: 'cast-1', name: 'Alice', lineUserId: null },
      { id: 'cast-2', name: 'Beth', lineUserId: 'U-old' },
    ])
  })

  it('links cast when command is valid', async () => {
    const result = (await service.handleEvent({
      type: 'message',
      message: { type: 'text', text: 'reg cast-1' },
      source: { type: 'user', userId: 'U-new' },
    })) as CastRegistrationResult

    expect(result.status).toBe('linked')
    expect(result.castId).toBe('cast-1')
    expect(messagingClient.messages).toHaveLength(1)
    expect(messagingClient.messages[0]).toEqual({
      to: 'U-new',
      text: expect.stringContaining('LINE連携が完了しました。'),
    })
  })

  it('returns not_found when cast does not exist', async () => {
    const outcome = await service.handleEvent({
      type: 'message',
      message: { type: 'text', text: 'reg missing-cast' },
      source: { type: 'user', userId: 'U-new' },
    })

    expect(outcome.status).toBe('not_found')
    expect(messagingClient.messages[0].text).toContain('見つかりません')
  })

  it('returns conflict when another cast already uses the LINE user ID', async () => {
    const outcome = await service.handleEvent({
      type: 'message',
      message: { type: 'text', text: 'reg cast-1' },
      source: { type: 'user', userId: 'U-old' },
    })

    expect(outcome.status).toBe('conflict')
    expect(messagingClient.messages[0].text).toContain('既に別のキャスト')
  })

  it('sends instructions on follow event', async () => {
    const outcome = await service.handleEvent({
      type: 'follow',
      source: { type: 'user', userId: 'U-follow' },
    })

    expect(outcome.status).toBe('acknowledged')
    expect(messagingClient.messages[0].text).toContain('reg <キャストID>')
  })

  it('ignores unsupported event types', async () => {
    const outcome = await service.handleEvent({
      type: 'message',
      message: { type: 'text', text: 'hello' },
      source: { type: 'user', userId: 'U-new' },
    })

    expect(outcome.status).toBe('ignored')
    expect(outcome.reason).toBe('unrecognized_command')
    expect(messagingClient.messages).toHaveLength(0)
  })

  it('links cast when postback event contains valid cast ID', async () => {
    const result = (await service.handleEvent({
      type: 'postback',
      postback: { data: 'action=register&castId=cast-1' },
      source: { type: 'user', userId: 'U-new' },
    })) as CastRegistrationResult

    expect(result.status).toBe('linked')
    expect(result.castId).toBe('cast-1')
    expect(messagingClient.messages).toHaveLength(1)
    expect(messagingClient.messages[0]).toEqual({
      to: 'U-new',
      text: expect.stringContaining('LINE連携が完了しました。'),
    })
  })

  it('returns not_found when postback cast ID does not exist', async () => {
    const outcome = await service.handleEvent({
      type: 'postback',
      postback: { data: 'action=register&castId=missing-cast' },
      source: { type: 'user', userId: 'U-new' },
    })

    expect(outcome.status).toBe('not_found')
    expect(messagingClient.messages[0].text).toContain('見つかりません')
  })

  it('ignores postback event without castId', async () => {
    const outcome = await service.handleEvent({
      type: 'postback',
      postback: { data: 'action=other' },
      source: { type: 'user', userId: 'U-new' },
    })

    expect(outcome.status).toBe('ignored')
    expect(outcome.reason).toBe('unrecognized_command')
    expect(messagingClient.messages).toHaveLength(0)
  })
})
