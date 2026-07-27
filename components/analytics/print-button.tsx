'use client'

/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md C-7 and C-14 print action consistency
 * @related_to   analytics report pages and the global print stylesheet
 * @known_issues Browser print destination and paper size remain user-controlled
 */
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PrintButtonProps {
  onClick: () => void
}

export function PrintButton({ onClick }: PrintButtonProps) {
  return (
    <Button type="button" variant="default" className="print-hidden" onClick={onClick}>
      <Printer className="mr-2 h-4 w-4" />
      印刷する
    </Button>
  )
}
