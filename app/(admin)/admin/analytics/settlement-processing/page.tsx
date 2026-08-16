/**
 * @design_doc   Store-wide settlement processing screen
 * @related_to   SettlementLedgerClient
 * @known_issues Legacy settlement history is not imported
 */
import { SettlementLedgerClient } from '@/components/analytics/settlement-ledger-client'

export const dynamic = 'force-dynamic'

export default function SettlementProcessingPage() {
  return <SettlementLedgerClient mode="settlement" />
}
