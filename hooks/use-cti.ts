'use client'

import { useState, useCallback } from 'react'
import { Customer } from '@/lib/customer/types'
import { customers } from '@/lib/customer/data'

export interface IncomingCall {
  id: string
  phoneNumber: string
  customer?: Customer | null
  startTime: Date
}

export function useCTI() {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)

  // 電話番号から顧客を検索
  const findCustomerByPhone = useCallback((phoneNumber: string): Customer | null => {
    return (
      customers.find(
        (customer) =>
          customer.phone === phoneNumber ||
          customer.phone?.replace(/[-\s]/g, '') === phoneNumber.replace(/[-\s]/g, '')
      ) || null
    )
  }, [])

  // 着信表示
  const showIncomingCall = useCallback(
    (phoneNumber: string) => {
      const customer = findCustomerByPhone(phoneNumber)
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

  // 着信応答
  const answerCall = useCallback(() => {
    if (incomingCall) {
      console.log('着信に応答しました:', incomingCall.phoneNumber)
      setIncomingCall(null)
    }
  }, [incomingCall])

  // 着信拒否
  const rejectCall = useCallback(() => {
    if (incomingCall) {
      console.log('着信を拒否しました:', incomingCall.phoneNumber)
      setIncomingCall(null)
    }
  }, [incomingCall])

  return {
    incomingCall,
    answerCall,
    rejectCall,
    showIncomingCall,
  }
}
