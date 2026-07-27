'use client'

/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md A-4
 * @related_to   GET /api/customer/by-phone/[phone]: persisted administrator lookup
 * @known_issues PBX integration is not configured; URL-triggered caller display is read-only
 */
import { useState, useCallback } from 'react'
import type { Customer } from '@/lib/customer/types'

export interface IncomingCall {
  id: string
  phoneNumber: string
  customer?: Customer | null
  startTime: Date
}

export function useCTI() {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)

  // 電話番号から顧客を検索
  const findCustomerByPhone = useCallback(async (phoneNumber: string): Promise<Customer | null> => {
    const response = await fetch(
      `/api/customer/by-phone/${encodeURIComponent(phoneNumber.replace(/[-\s]/g, ''))}`,
      { credentials: 'include', cache: 'no-store' }
    )
    if (response.status === 404) return null
    if (!response.ok) {
      throw new Error(`Customer lookup failed: ${response.status}`)
    }
    return response.json() as Promise<Customer>
  }, [])

  // 着信表示
  const showIncomingCall = useCallback(
    async (phoneNumber: string) => {
      const customer = await findCustomerByPhone(phoneNumber).catch(() => null)
      const call: IncomingCall = {
        id: `call_${Date.now()}`,
        phoneNumber,
        customer,
        startTime: new Date(),
      }
      setIncomingCall(call)
    },
    [findCustomerByPhone]
  )

  const closeIncomingCall = useCallback(() => setIncomingCall(null), [])

  return {
    incomingCall,
    closeIncomingCall,
    showIncomingCall,
  }
}
