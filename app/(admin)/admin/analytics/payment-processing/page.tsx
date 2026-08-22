/**
 * @design_doc   Store-wide payment processing screen now shares the unified settlement view
 * @related_to   SettlementLedgerClient
 * @known_issues Legacy settlement history is not imported
 */
import { SettlementLedgerClient } from '@/components/analytics/settlement-ledger-client'

export const dynamic = 'force-dynamic'

export default function PaymentProcessingPage() {
  return <SettlementLedgerClient mode="payment" />
}
