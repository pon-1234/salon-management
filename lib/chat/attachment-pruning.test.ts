import { describe, expect, it, vi } from 'vitest'
import type { ChatAttachment } from '@/lib/types/chat'
import {
  CHAT_ATTACHMENT_PRUNE_ACKNOWLEDGEMENT,
  assertChatAttachmentPruneAcknowledged,
  parseChatAttachmentRetentionDays,
  pruneMessageAttachments,
} from './attachment-pruning'

const attachment = (path?: string): ChatAttachment => ({
  type: 'image',
  url: `https://salon.example.com/${path ?? 'missing-path.jpg'}`,
  path,
})

describe('parseChatAttachmentRetentionDays', () => {
  it.each([undefined, '', ' ', '0', '-1', '29', '30.5', 'Infinity', 'NaN', 'abc'])(
    'fails closed for an unsafe retention value: %s',
    (value) => {
      expect(() => parseChatAttachmentRetentionDays(value)).toThrow()
    }
  )

  it('accepts a finite integer of at least 30 days', () => {
    expect(parseChatAttachmentRetentionDays('30')).toBe(30)
    expect(parseChatAttachmentRetentionDays('180')).toBe(180)
  })
})

describe('assertChatAttachmentPruneAcknowledged', () => {
  it.each([undefined, '', 'true', 'yes', 'I_UNDERSTAND'])(
    'rejects a missing or ambiguous acknowledgement: %s',
    (value) => {
      expect(() => assertChatAttachmentPruneAcknowledged(value)).toThrow()
    }
  )

  it('accepts only the explicit production-data acknowledgement', () => {
    expect(() =>
      assertChatAttachmentPruneAcknowledged(CHAT_ATTACHMENT_PRUNE_ACKNOWLEDGEMENT)
    ).not.toThrow()
  })
})

describe('pruneMessageAttachments', () => {
  it('clears database metadata only after every file deletion succeeds', async () => {
    const deleteFile = vi.fn().mockResolvedValue({ success: true })
    const clearAttachments = vi.fn().mockResolvedValue(undefined)

    const result = await pruneMessageAttachments(
      {
        id: 'message-1',
        attachments: [attachment('chat/one.jpg'), attachment('chat/two.jpg')],
      },
      { deleteFile, clearAttachments }
    )

    expect(deleteFile).toHaveBeenCalledTimes(2)
    expect(clearAttachments).toHaveBeenCalledWith('message-1')
    expect(deleteFile.mock.invocationCallOrder[1]).toBeLessThan(
      clearAttachments.mock.invocationCallOrder[0]
    )
    expect(result).toEqual({ cleared: true, filesRemoved: 2, error: null })
  })

  it('retains database metadata when any file deletion reports a failure', async () => {
    const deleteFile = vi
      .fn()
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, error: 'storage unavailable' })
    const clearAttachments = vi.fn().mockResolvedValue(undefined)

    const result = await pruneMessageAttachments(
      {
        id: 'message-2',
        attachments: [attachment('chat/one.jpg'), attachment('chat/two.jpg')],
      },
      { deleteFile, clearAttachments }
    )

    expect(clearAttachments).not.toHaveBeenCalled()
    expect(result).toEqual({
      cleared: false,
      filesRemoved: 1,
      error: 'storage unavailable',
    })
  })

  it('retains database metadata when deletion throws', async () => {
    const deleteFile = vi.fn().mockRejectedValue(new Error('storage timeout'))
    const clearAttachments = vi.fn().mockResolvedValue(undefined)

    const result = await pruneMessageAttachments(
      { id: 'message-3', attachments: [attachment('chat/one.jpg')] },
      { deleteFile, clearAttachments }
    )

    expect(clearAttachments).not.toHaveBeenCalled()
    expect(result).toEqual({ cleared: false, filesRemoved: 0, error: 'storage timeout' })
  })

  it('does not delete or clear metadata when an attachment lacks a storage path', async () => {
    const deleteFile = vi.fn().mockResolvedValue({ success: true })
    const clearAttachments = vi.fn().mockResolvedValue(undefined)

    const result = await pruneMessageAttachments(
      {
        id: 'message-4',
        attachments: [attachment('chat/one.jpg'), attachment()],
      },
      { deleteFile, clearAttachments }
    )

    expect(deleteFile).not.toHaveBeenCalled()
    expect(clearAttachments).not.toHaveBeenCalled()
    expect(result).toEqual({
      cleared: false,
      filesRemoved: 0,
      error: '添付ファイルにストレージパスがありません',
    })
  })
})
