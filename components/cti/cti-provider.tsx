"use client"

import { useCTI } from "@/hooks/use-cti"
import { IncomingCallPopup } from "./incoming-call-popup"
import { useRouter } from 'next/navigation'

interface CTIProviderProps {
  children: React.ReactNode
}

export function CTIProvider({ children }: CTIProviderProps) {
  const { incomingCall, answerCall, rejectCall } = useCTI()
  const router = useRouter()

  const handleViewDetails = () => {
    if (incomingCall?.customer) {
      router.push(`/customers/${incomingCall.customer.id}`)
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