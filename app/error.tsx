'use client'

import { useEffect } from 'react'
import { logError } from '@/lib/utils/error-logger'
import { Button } from '@/components/ui/button'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    logError(error, {
      context: {
        component: 'GlobalErrorBoundary',
      },
    })
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h2 className="mb-4 text-2xl font-bold">エラーが発生しました</h2>
      <p className="mb-4 text-red-500">{error.message}</p>
      <Button onClick={() => reset()} className="bg-emerald-600 text-white hover:bg-emerald-700">
        もう一度試す
      </Button>
    </div>
  )
}
