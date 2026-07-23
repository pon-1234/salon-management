/**
 * @design_doc   Public request-attendance submission security tests
 * @related_to   app/api/request-attendance/route.ts, public request IP rate limiter
 * @known_issues None currently
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

const mocks = vi.hoisted(() => ({
  findCast: vi.fn(),
  sendEmail: vi.fn(),
  consumeRateLimit: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    cast: {
      findFirst: mocks.findCast,
    },
  },
}))

vi.mock('@/lib/email/client', () => ({
  emailClient: {
    send: mocks.sendEmail,
  },
}))

vi.mock('@/lib/security/public-request-rate-limit', () => ({
  consumeRequestAttendanceRateLimit: mocks.consumeRateLimit,
}))

vi.mock('@/lib/logger', () => ({
  default: {
    error: mocks.loggerError,
  },
}))

const validPayload = {
  storeId: 'store-1',
  castId: 'cast-1',
  name: '山田 太郎',
  age: '28',
  email: 'customer@example.com',
  phone: '090-1234-5678',
  memberStatus: 'new',
  preferredDate: '2099-08-01',
  preferredTime: '18:30',
  meetingPlace: '池袋駅西口',
  course: '100分',
  secondCandidate: '別の候補',
  notes: '連絡はメール希望',
}

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/request-attendance', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '203.0.113.10',
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/request-attendance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.consumeRateLimit.mockReturnValue({ allowed: true })
    mocks.findCast.mockResolvedValue({
      id: 'cast-1',
      name: '正規キャスト名',
      requestAttendanceEnabled: true,
      store: {
        id: 'store-1',
        name: '正規店舗名',
        displayName: '正規店舗表示名',
        email: 'store@example.com',
        isActive: true,
      },
    })
    mocks.sendEmail.mockResolvedValue({ success: true })
  })

  it('uses canonical store and cast values from the database in the notification', async () => {
    const response = await POST(createRequest(validPayload))

    expect(response.status).toBe(200)
    expect(mocks.findCast).toHaveBeenCalledWith({
      where: {
        id: 'cast-1',
        storeId: 'store-1',
        requestAttendanceEnabled: true,
        store: { isActive: true },
      },
      select: {
        id: true,
        name: true,
        store: {
          select: {
            id: true,
            name: true,
            displayName: true,
            email: true,
          },
        },
      },
    })
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1)

    const message = mocks.sendEmail.mock.calls[0][0]
    expect(message.to).toBe('store@example.com')
    expect(message.subject).toContain('正規キャスト名')
    expect(message.body).toContain('店舗: 正規店舗表示名 (store-1)')
    expect(message.body).toContain('第1候補女性: 正規キャスト名 (cast-1)')
  })

  it('escapes customer-controlled values before placing them in the HTML email body', async () => {
    const response = await POST(
      createRequest({
        ...validPayload,
        name: `<img src=x onerror="alert(1)"> & 'owner'`,
        meetingPlace: `<b>"VIP" & '駅'</b>`,
        notes: `<script>alert("x")</script> & 'quoted'`,
      })
    )

    expect(response.status).toBe(200)

    const message = mocks.sendEmail.mock.calls[0][0]
    expect(message.body).not.toContain('<img')
    expect(message.body).not.toContain('<script>')
    expect(message.body).not.toContain('<b>')
    expect(message.body).toContain(
      `&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;owner&#39;`
    )
    expect(message.body).toContain(`&lt;b&gt;&quot;VIP&quot; &amp; &#39;駅&#39;&lt;/b&gt;`)
    expect(message.body).toContain(
      `&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;quoted&#39;`
    )
  })

  it('rejects caller-provided store and cast names instead of trusting them', async () => {
    const response = await POST(
      createRequest({
        ...validPayload,
        storeName: '偽店舗名',
        castName: '偽キャスト名',
      })
    )

    expect(response.status).toBe(400)
    expect(mocks.findCast).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it.each([
    ['age outside the accepted range', { age: '17' }],
    ['invalid calendar date', { preferredDate: '2099-02-31' }],
    ['invalid time', { preferredTime: '25:00' }],
    ['invalid phone characters', { phone: '090-ABCD-5678' }],
    ['line break in a single-line field', { course: '100分\nBCC: victim@example.com' }],
    ['oversized notes', { notes: 'a'.repeat(1001) }],
  ])('rejects %s', async (_label, override) => {
    const response = await POST(createRequest({ ...validPayload, ...override }))

    expect(response.status).toBe(400)
    expect(mocks.findCast).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it('treats malformed JSON as invalid input without logging its contents', async () => {
    const request = new NextRequest('http://localhost:3000/api/request-attendance', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '203.0.113.10',
      },
      body: '{"email":"customer@example.com"',
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    expect(mocks.loggerError).not.toHaveBeenCalled()
    expect(mocks.findCast).not.toHaveBeenCalled()
  })

  it('returns 429 before parsing or querying when the IP limit is exhausted', async () => {
    mocks.consumeRateLimit.mockReturnValue({
      allowed: false,
      retryAfterSeconds: 321,
      reason: 'rate-limited',
    })
    const request = new NextRequest('http://localhost:3000/api/request-attendance', {
      method: 'POST',
      headers: { 'x-forwarded-for': '203.0.113.10' },
      body: '{not-json',
    })

    const response = await POST(request)

    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('321')
    expect(mocks.findCast).not.toHaveBeenCalled()
  })

  it('fails closed when a trustworthy client IP is unavailable', async () => {
    mocks.consumeRateLimit.mockReturnValue({
      allowed: false,
      retryAfterSeconds: 60,
      reason: 'unidentified-client',
    })

    const response = await POST(createRequest(validPayload))

    expect(response.status).toBe(503)
    expect(mocks.findCast).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it('does not report success when provider delivery fails', async () => {
    mocks.sendEmail.mockResolvedValue({ success: false, error: 'provider rejected message' })

    const response = await POST(createRequest(validPayload))

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ error: 'メール送信に失敗しました。' })
  })

  it('fails before delivery when the canonical store destination is invalid', async () => {
    mocks.findCast.mockResolvedValueOnce({
      id: 'cast-1',
      name: '正規キャスト名',
      store: {
        id: 'store-1',
        name: '正規店舗名',
        displayName: '正規店舗表示名',
        email: 'not-an-email',
      },
    })

    const response = await POST(createRequest(validPayload))

    expect(response.status).toBe(500)
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it('logs only a redacted error classification on unexpected failures', async () => {
    mocks.findCast.mockRejectedValue(
      new Error('customer@example.com / 090-1234-5678 could not be processed')
    )

    const response = await POST(createRequest(validPayload))

    expect(response.status).toBe(500)
    expect(mocks.loggerError).toHaveBeenCalledWith(
      { event: 'request_attendance_submission_failed', errorType: 'Error' },
      'Failed to submit request attendance'
    )
    expect(JSON.stringify(mocks.loggerError.mock.calls)).not.toContain('customer@example.com')
    expect(JSON.stringify(mocks.loggerError.mock.calls)).not.toContain('090-1234-5678')
  })
})
