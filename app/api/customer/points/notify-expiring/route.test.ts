/**
 * @design_doc   docs/VPS_DEPLOYMENT.md point-expiration fail-closed policy
 * @related_to   app/api/customer/points/notify-expiring/route.ts
 * @known_issues FIFO point-lot allocation and reconciliation are not approved
 */
import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'
import { db } from '@/lib/db'
import { emailClient } from '@/lib/email/client'

vi.mock('@/lib/db', () => ({
  db: {
    customerPointHistory: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/email/client', () => ({
  emailClient: {
    send: vi.fn(),
  },
}))

describe('POST /api/customer/points/notify-expiring', () => {
  it('fails closed without querying or notifying from unallocated point lots', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/customer/points/notify-expiring', {
        method: 'POST',
      })
    )
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.error).toContain('FIFO')
    expect(db.customerPointHistory.findMany).not.toHaveBeenCalled()
    expect(emailClient.send).not.toHaveBeenCalled()
  })
})
