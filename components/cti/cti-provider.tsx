'use client'

import { useCTI } from '@/hooks/use-cti'
import { IncomingCallPopup } from './incoming-call-popup'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

interface CTIProviderProps {
  children: React.ReactNode
}

export function CTIProvider({ children }: CTIProviderProps) {
  const { incomingCall, answerCall, rejectCall, showIncomingCall } = useCTI()
  const router = useRouter()
  const searchParams = useSearchParams()

  // URLパラメータで着信をトリガー
  useEffect(() => {
    const tel = searchParams.get('tel')
    if (tel && !incomingCall) {
      showIncomingCall(tel)
      // URLパラメータをクリア
      const url = new URL(window.location.href)
      url.searchParams.delete('tel')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams, incomingCall, showIncomingCall])

  const handleViewDetails = () => {
    if (incomingCall?.customer) {
      router.push(`/admin/customers/${incomingCall.customer.id}`)
    }
  }

  return (
    <>
      {children}

      {/* CTI着信ポップアップ */}
      <IncomingCallPopup
        isOpen={!!incomingCall}
        phoneNumber={incomingCall?.phoneNumber || ''}
        customer={incomingCall?.customer}
        onAnswer={answerCall}
        onReject={rejectCall}
        onViewDetails={handleViewDetails}
        onClose={rejectCall}
      />
    </>
  )
}
