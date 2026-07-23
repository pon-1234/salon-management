/**
 * @design_doc   docs/VPS_DEPLOYMENT.md point-expiration fail-closed policy
 * @related_to   Customer point ledger and outbound email notifications
 * @known_issues FIFO point-lot allocation, migration, and reconciliation are not approved
 */
'use server'

import { NextRequest, NextResponse } from 'next/server'

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error: 'FIFOポイントロットの配賦・移行・照合が承認されるまで、ポイント失効予定通知は無効です',
    },
    { status: 503 }
  )
}
