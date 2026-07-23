/**
 * @design_doc   Secret-free readiness endpoint for production operations
 * @related_to   lib/operations/readiness.ts, deploy/xserver-vps
 * @known_issues Third-party reachability is monitored through delivery-failure logs, not live probe traffic
 */
import { NextResponse } from 'next/server'
import { getOperationalReadiness } from '@/lib/operations/readiness'

export async function GET() {
  const readiness = await getOperationalReadiness()

  return NextResponse.json(
    {
      status: readiness.ready ? 'ready' : 'not_ready',
      checks: readiness.checks,
    },
    { status: readiness.ready ? 200 : 503 }
  )
}
