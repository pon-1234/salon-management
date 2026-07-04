/**
 * @design_doc   refactor-instructions.md Phase 3 logger unification coverage
 * @related_to   errors.ts - standard API error responses and logging
 * @known_issues None currently
 */
import { describe, expect, it, vi } from 'vitest'

import logger from '@/lib/logger'

import { handleApiError } from './errors'

vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
  },
}))

describe('handleApiError', () => {
  it('logs generic errors through the structured logger and preserves response shape', async () => {
    const error = new Error('boom')

    const response = handleApiError(error)
    const body = await response.json()

    expect(logger.error).toHaveBeenCalledWith('API error:', error)
    expect(response.status).toBe(500)
    expect(body).toEqual({
      error: 'boom',
      code: 'INTERNAL_ERROR',
    })
  })

  it('logs unknown errors through the structured logger and returns the unknown error code', async () => {
    const error = { reason: 'not an Error instance' }

    const response = handleApiError(error)
    const body = await response.json()

    expect(logger.error).toHaveBeenCalledWith('Unknown error:', error)
    expect(response.status).toBe(500)
    expect(body).toEqual({
      error: '予期しないエラーが発生しました',
      code: 'UNKNOWN_ERROR',
    })
  })
})
