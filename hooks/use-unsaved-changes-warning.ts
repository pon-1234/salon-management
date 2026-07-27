'use client'

/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md K-4 unsaved form protection
 * @related_to   CastForm and other long-running administrative forms
 * @known_issues Client-side route transitions need an in-app confirmation dialog per form
 */
import { useEffect } from 'react'

export function useUnsavedChangesWarning(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) {
      return
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isDirty])
}
