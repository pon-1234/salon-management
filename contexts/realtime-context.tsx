/**
 * @design_doc   docs/REALTIME_CHAT_IMPLEMENTATION_PLAN.md
 * @related_to   app/api/realtime/route.ts and chat/notification consumers
 * @known_issues Native EventSource controls reconnect backoff and connection recovery
 */
'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'

const RealtimeRevisionContext = createContext<number | undefined>(undefined)

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession()
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (status !== 'authenticated') {
      return
    }

    const source = new EventSource('/api/realtime')
    const handleRefresh = () => setRevision((current) => current + 1)
    source.addEventListener('refresh', handleRefresh)

    return () => {
      source.removeEventListener('refresh', handleRefresh)
      source.close()
    }
  }, [status])

  const value = useMemo(() => revision, [revision])
  return (
    <RealtimeRevisionContext.Provider value={value}>{children}</RealtimeRevisionContext.Provider>
  )
}

export function useRealtimeRevision(): number {
  const revision = useContext(RealtimeRevisionContext)
  if (revision === undefined) {
    throw new Error('useRealtimeRevision must be used within a RealtimeProvider')
  }
  return revision
}
