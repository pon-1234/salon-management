'use client'

/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md A-4
 * @related_to   InfiniTalk HTML/URL popup; IncomingCallPopup; useCTI phone lookup
 * @known_issues InfiniTalk client popup blockers remain an operator browser setting
 */
import { useCTI } from '@/hooks/use-cti'
import { IncomingCallPopup } from './incoming-call-popup'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import {
  CTI_INCOMING_CHANNEL,
  createIncomingCallBroadcast,
  isIncomingCallBroadcast,
  readCalledNumber,
  readIncomingCallPhone,
  stripIncomingCallParams,
} from '@/lib/cti/incoming-call-params'

interface CTIProviderProps {
  children: React.ReactNode
}

export function CTIProvider({ children }: CTIProviderProps) {
  const { incomingCall, closeIncomingCall, showIncomingCall } = useCTI()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const phoneNumber = readIncomingCallPhone(searchParams)
    if (!phoneNumber) return

    const calledNumber = readCalledNumber(searchParams)
    void showIncomingCall(phoneNumber, calledNumber)

    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(CTI_INCOMING_CHANNEL)
      channel.postMessage(createIncomingCallBroadcast(phoneNumber, calledNumber))
      channel.close()
    }

    const url = new URL('http://cti.invalid')
    url.search = searchParams.toString()
    stripIncomingCallParams(url)
    const query = url.searchParams.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [pathname, router, searchParams, showIncomingCall])

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined

    const channel = new BroadcastChannel(CTI_INCOMING_CHANNEL)
    channel.onmessage = (event) => {
      if (isIncomingCallBroadcast(event.data)) {
        void showIncomingCall(event.data.phoneNumber, event.data.calledNumber)
      }
    }
    return () => channel.close()
  }, [showIncomingCall])

  const handleViewDetails = () => {
    if (incomingCall?.customer) {
      router.push(`/admin/customers/${incomingCall.customer.id}`)
    }
  }

  return (
    <>
      {children}

      <IncomingCallPopup
        isOpen={!!incomingCall}
        phoneNumber={incomingCall?.phoneNumber || ''}
        calledNumber={incomingCall?.calledNumber}
        customer={incomingCall?.customer}
        onViewDetails={handleViewDetails}
        onClose={closeIncomingCall}
      />
    </>
  )
}
