/**
 * @design_doc   API credential-boundary requirements
 * @related_to   Prisma relation payloads returned by API routes
 * @known_issues None currently
 */
import { describe, expect, it } from 'vitest'
import { sanitizeResponseData } from './sanitize-response'

describe('sanitizeResponseData', () => {
  it('removes credential and verification fields recursively', () => {
    const createdAt = new Date('2026-07-19T00:00:00.000Z')
    const result = sanitizeResponseData({
      id: 'reservation-1',
      createdAt,
      customer: {
        id: 'customer-1',
        password: 'hash',
        resetToken: 'reset-secret',
        resetTokenExpiry: createdAt,
        emailVerificationToken: 'email-secret',
        emailVerificationExpiry: createdAt,
        phoneVerificationCode: '123456',
        phoneVerificationExpiry: createdAt,
        phoneVerificationAttempts: 2,
      },
      casts: [{ id: 'cast-1', passwordHash: 'cast-secret' }],
    })

    expect(result).toEqual({
      id: 'reservation-1',
      createdAt,
      customer: { id: 'customer-1' },
      casts: [{ id: 'cast-1' }],
    })
    expect(result.createdAt).toBe(createdAt)
  })

  it('supports route-specific private fields without deleting similarly named fields', () => {
    const result = sanitizeResponseData(
      {
        cast: {
          loginEmail: 'cast@example.com',
          lineUserId: 'line-secret',
          email: 'public@example.com',
        },
      },
      ['loginEmail', 'lineUserId']
    )

    expect(result).toEqual({ cast: { email: 'public@example.com' } })
  })
})
