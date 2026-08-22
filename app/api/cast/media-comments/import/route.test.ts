/**
 * @design_doc   EXT-01 媒体コメント取り込みは手入力を消さない
 * @related_to   POST /api/cast/media-comments/import
 * @known_issues None
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/auth/utils'
import { db } from '@/lib/db'

import { POST } from './route'

vi.mock('@/lib/auth/utils', () => ({
  requireAdmin: vi.fn(() => Promise.resolve(null)),
}))

vi.mock('@/lib/logger', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

vi.mock('@/lib/db', () => ({
  db: {
    store: { findUnique: vi.fn() },
    storeSettings: { findUnique: vi.fn() },
    cast: { findMany: vi.fn(), update: vi.fn() },
  },
}))

describe('POST /api/cast/media-comments/import', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAdmin).mockResolvedValue(null)
    vi.mocked(db.store.findUnique).mockResolvedValue({ id: 'ikebukuro' } as never)
    vi.mocked(db.storeSettings.findUnique).mockResolvedValue({
      mediaCommentOverwrite: false,
    } as never)
    vi.mocked(db.cast.findMany).mockResolvedValue([
      {
        id: 'cast-empty',
        mediaComment: '',
        mediaCommentSource: 'manual',
        mediaSyncExcluded: false,
      },
      {
        id: 'cast-manual',
        mediaComment: '手入力',
        mediaCommentSource: 'manual',
        mediaSyncExcluded: false,
      },
    ] as never)
    vi.mocked(db.cast.update).mockResolvedValue({} as never)
  })

  it('rejects unauthorized requests before reading casts', async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    )

    const response = await POST(
      new NextRequest('http://localhost/api/cast/media-comments/import?storeId=ikebukuro', {
        method: 'POST',
        body: JSON.stringify({
          source: 'heaven',
          comments: [{ castId: 'cast-empty', comment: 'ヘブン' }],
        }),
      })
    )

    expect(response.status).toBe(403)
    expect(db.cast.findMany).not.toHaveBeenCalled()
    expect(db.cast.update).not.toHaveBeenCalled()
  })

  it('updates empty comments and leaves manual comments untouched unless overwrite is enabled', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/cast/media-comments/import?storeId=ikebukuro', {
        method: 'POST',
        body: JSON.stringify({
          source: 'heaven',
          comments: [
            { castId: 'cast-empty', comment: 'ヘブン' },
            { castId: 'cast-manual', comment: '上書き禁止' },
          ],
        }),
      })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      updatedCount: 1,
      skippedCount: 1,
      updatedIds: ['cast-empty'],
    })
    expect(db.cast.update).toHaveBeenCalledTimes(1)
    expect(db.cast.update).toHaveBeenCalledWith({
      where: { id: 'cast-empty' },
      data: { mediaComment: 'ヘブン', mediaCommentSource: 'heaven' },
    })
  })
})
