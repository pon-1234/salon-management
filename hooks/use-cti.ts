"use client"

import { useState, useEffect, useCallback } from 'react'
import { Customer } from "@/lib/customer/types"
import { customers } from "@/lib/customer/data"

export interface IncomingCall {
  id: string
  phoneNumber: string
  customer?: Customer | null
  startTime: Date
  isActive: boolean
}

export function useCTI() {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // 電話番号から顧客を検索
  const findCustomerByPhone = useCallback((phoneNumber: string): Customer | null => {
    return customers.find(customer => 
      customer.phone === phoneNumber ||
      customer.phone?.replace(/[-\s]/g, '') === phoneNumber.replace(/[-\s]/g, '')
    ) || null
  }, [])

  // 着信をシミュレート（実際のCTI APIに置き換える）
  const simulateIncomingCall = useCallback((phoneNumber: string) => {
    const customer = findCustomerByPhone(phoneNumber)
    const call: IncomingCall = {
      id: `call_${Date.now()}`,
      phoneNumber,
      customer,
      startTime: new Date(),
      isActive: true
    }
    setIncomingCall(call)
  }, [findCustomerByPhone])

  // 着信応答
  const answerCall = useCallback(() => {
    if (incomingCall) {
      console.log('着信に応答しました:', incomingCall.phoneNumber)
      // 実際のCTI APIで応答処理
      setIncomingCall(null)
    }
  }, [incomingCall])

  // 着信拒否
  const rejectCall = useCallback(() => {
    if (incomingCall) {
      console.log('着信を拒否しました:', incomingCall.phoneNumber)
      // 実際のCTI APIで拒否処理
      setIncomingCall(null)
    }
  }, [incomingCall])

  // 通話終了
  const endCall = useCallback(() => {
    console.log('通話を終了しました')
    // 実際のCTI APIで終了処理
    setIncomingCall(null)
  }, [])

  // CTI接続状態の監視（実際のCTI APIに置き換える）
  useEffect(() => {
    // CTI システムとの接続をシミュレート
    setIsConnected(true)
    
    // WebSocket接続や実際のCTI APIの初期化をここで行う
    return () => {
      setIsConnected(false)
    }
  }, [])

  return {
    incomingCall,
    isConnected,
    answerCall,
    rejectCall,
    endCall,
    simulateIncomingCall // デモ用（実際の実装では削除）
  }
}