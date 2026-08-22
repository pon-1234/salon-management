/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md A-4
 * @related_to   use-cti.ts, GET /api/customer/by-phone/[phone]
 * @known_issues PBX transport remains outside the read-only caller lookup
 */
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCTI } from './use-cti'

vi.mock('@/contexts/store-context', () => ({
  useStore: () => ({ currentStore: { id: 'store-ikebukuro' } }),
}))

describe('useCTI', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'customer-1', name: 'Caller' }),
    } as Response)
  })

  it('keeps incoming phone lookup inside the selected store', async () => {
    const { result } = renderHook(() => useCTI())

    await act(async () => {
      await result.current.showIncomingCall('090-1234-5678', '03-1234-5678')
    })

    expect(fetch).toHaveBeenCalledWith(
      '/api/customer/by-phone/09012345678?storeId=store-ikebukuro',
      { credentials: 'include', cache: 'no-store' }
    )
    expect(result.current.incomingCall?.customer?.id).toBe('customer-1')
    expect(result.current.incomingCall?.calledNumber).toBe('03-1234-5678')
  })
})
