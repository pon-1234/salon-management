'use client'

import { useEffect } from 'react'
import { logError } from '@/lib/utils/error-logger'
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  useEffect(() => {
    logError(error, {
      context: {
        component: 'GlobalErrorBoundary',
      },
    });
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-bold mb-4">エラーが発生しました</h2>
      <p className="text-red-500 mb-4">{error.message}</p>
      <Button
        onClick={() => reset()}
        className="bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        もう一度試す
      </Button>
    </div>
  )
}
