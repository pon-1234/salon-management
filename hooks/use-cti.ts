'use client'

/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md A-4
 * @related_to   GET /api/customer/by-phone/[phone]: persisted administrator lookup
 * @known_issues InfiniTalk still delivers the caller over HTML/URL query params; the overlay is read-only
 */
import { useState, useCallback } from 'react'
import type { Customer } from '@/lib/customer/types'
import { useStore } from '@/contexts/store-context'
import { buildStoreScopedEndpoint } from '@/lib/store/endpoints'

export interface IncomingCall {
  id: string
  phoneNumber: string
  calledNumber?: string | null
  customer?: Customer | null
  startTime: Date
}

export function useCTI() {
  const { currentStore } = useStore()
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)

  // 電話番号から顧客を検索
  const findCustomerByPhone = useCallback(
    async (phoneNumber: string): Promise<Customer | null> => {
      const response = await fetch(
        buildStoreScopedEndpoint(
          `/api/customer/by-phone/${encodeURIComponent(phoneNumber.replace(/[-\s]/g, ''))}`,
          currentStore.id
        ),
        { credentials: 'include', cache: 'no-store' }
      )
      if (response.status === 404) return null
      if (!response.ok) {
        throw new Error(`Customer lookup failed: ${response.status}`)
      }
      return response.json() as Promise<Customer>
    },
    [currentStore.id]
  )

  // 着信表示
  const showIncomingCall = useCallback(
    async (phoneNumber: string, calledNumber?: string | null) => {
      const customer = await findCustomerByPhone(phoneNumber).catch(() => null)
      const call: IncomingCall = {
        id: `call_${Date.now()}`,
        phoneNumber,
        calledNumber: calledNumber ?? null,
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
