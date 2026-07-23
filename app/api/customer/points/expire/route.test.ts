/**
 * @design_doc   docs/VPS_DEPLOYMENT.md point-expiration fail-closed policy
 * @related_to   app/api/customer/points/expire/route.ts
 * @known_issues FIFO point-lot allocation and reconciliation are not approved
 */
import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'
import { db } from '@/lib/db'
import { addPointTransaction } from '@/lib/point/utils'

vi.mock('@/lib/db', () => ({
  db: {
    customerPointHistory: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/point/utils', () => ({
  addPointTransaction: vi.fn(),
}))

describe('POST /api/customer/points/expire', () => {
  it.each([
    ['without credentials', undefined],
    ['with the former cron credential', 'Bearer test-cron-secret'],
  ])('fails closed %s without reading or mutating point data', async (_label, authorization) => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/customer/points/expire', {
        method: 'POST',
        ...(authorization ? { headers: { authorization } } : {}),
      })
    )
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.error).toContain('FIFO')
    expect(db.customerPointHistory.findMany).not.toHaveBeenCalled()
    expect(db.$transaction).not.toHaveBeenCalled()
    expect(addPointTransaction).not.toHaveBeenCalled()
  })
})
