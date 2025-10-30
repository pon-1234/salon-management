import { describe, it, expect, vi, afterEach } from 'vitest'
import { getModificationHistory, getModificationAlerts, recordModification } from './data'

describe('Modification History Data', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('getModificationHistory', () => {
    it('returns normalized history entries', async () => {
      const mockResponse = [
        {
          id: 'hist-1',
          reservationId: 'res-1',
          fieldName: 'status',
          fieldDisplayName: 'ステータス',
          oldValue: '仮予約',
          newValue: '確定済',
          reason: 'ステータスを更新',
          actorId: 'user-1',
          actorName: '管理者',
          actorIp: '127.0.0.1',
          actorAgent: 'jest',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ]

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => mockResponse,
        })
      )

      const history = await getModificationHistory('res-1')

      expect(history).toHaveLength(1)
      expect(history[0]).toMatchObject({
        id: 'hist-1',
        reservationId: 'res-1',
        fieldName: 'status',
        fieldDisplayName: 'ステータス',
        oldValue: '仮予約',
        newValue: '確定済',
        reason: 'ステータスを更新',
        actorId: 'user-1',
        actorName: '管理者',
      })
      expect(history[0].timestamp).toBeInstanceOf(Date)
    })

    it('returns empty array when API fails', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
        })
      )

      await expect(getModificationHistory('res-1')).rejects.toThrow()
    })
  })

  describe('getModificationAlerts', () => {
    it('returns empty array (not implemented)', async () => {
      const alerts = await getModificationAlerts('res-1')
      expect(alerts).toEqual([])
    })
  })

  describe('recordModification', () => {
    it('resolves without error (handled server-side)', async () => {
      await expect(recordModification()).resolves.toBeUndefined()
    })
  })
})
