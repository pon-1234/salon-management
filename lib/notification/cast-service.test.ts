/**
 * @design_doc   Cast-specific LINE recipient safety for entry-info notifications
 * @related_to   lib/notification/cast-service.ts and reservation entry-info API
 * @known_issues None
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LineMessagingClient } from '@/lib/line/client'
import { CastNotificationService } from './cast-service'

describe('CastNotificationService entry-info notifications', () => {
  const lineClient = {
    isConfigured: vi.fn(),
    getDefaultUserId: vi.fn(),
    pushText: vi.fn(),
  }

  const service = new CastNotificationService(lineClient as unknown as LineMessagingClient)

  beforeEach(() => {
    vi.clearAllMocks()
    lineClient.isConfigured.mockReturnValue(true)
    lineClient.getDefaultUserId.mockReturnValue('global-default-line-user')
    lineClient.pushText.mockResolvedValue(undefined)
  })

  it('delivers to the cast-specific LINE recipient and reports a real success', async () => {
    const result = await service.sendEntryInfoNotification({
      cast: { id: 'cast-1', name: 'キャスト', lineUserId: ' cast-line-user ' },
      message: '入室情報',
    })

    expect(lineClient.pushText).toHaveBeenCalledWith('cast-line-user', '入室情報')
    expect(result).toEqual({ status: 'sent' })
  })

  it('skips delivery when the cast has no LINE recipient and never uses the global default', async () => {
    const result = await service.sendEntryInfoNotification({
      cast: { id: 'cast-1', name: 'キャスト', lineUserId: '   ' },
      message: '入室情報',
    })

    expect(lineClient.getDefaultUserId).not.toHaveBeenCalled()
    expect(lineClient.pushText).not.toHaveBeenCalled()
    expect(result).toEqual({
      status: 'skipped',
      reason: 'キャストのLINEユーザーIDが登録されていません。',
    })
  })

  it('reports skipped delivery when outbound LINE delivery is disabled', async () => {
    lineClient.isConfigured.mockReturnValue(false)

    const result = await service.sendEntryInfoNotification({
      cast: { id: 'cast-1', name: 'キャスト', lineUserId: 'cast-line-user' },
      message: '入室情報',
    })

    expect(lineClient.pushText).not.toHaveBeenCalled()
    expect(result).toEqual({
      status: 'skipped',
      reason: 'LINE通知機能が無効のため送信していません。',
    })
  })
})
