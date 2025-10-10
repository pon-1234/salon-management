/**
 * @design_doc   Manual payment provider tests
 * @related_to   ManualPaymentProvider, PaymentService
 * @known_issues None currently
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ManualPaymentProvider } from '../providers/manual'

const buildRequest = () => ({
  reservationId: 'res_123',
  customerId: 'cust_123',
  amount: 12000,
  currency: 'jpy',
  paymentMethod: 'card' as const,
  provider: 'manual' as const,
  metadata: { origin: 'test' },
})

describe('ManualPaymentProvider', () => {
  let provider: ManualPaymentProvider

  beforeEach(() => {
    provider = new ManualPaymentProvider()
  })

  it('processes payments synchronously', async () => {
    const result = await provider.processPayment(buildRequest())

    expect(result.success).toBe(true)
    expect(result.transaction).toMatchObject({
      reservationId: 'res_123',
      customerId: 'cust_123',
      provider: 'manual',
      status: 'completed',
    })
  })

  it('creates and confirms payment intents', async () => {
    const request = buildRequest()
    const intent = await provider.createPaymentIntent(request)

    expect(intent.providerId).toMatch(/manual_intent_/)
    const confirmation = await provider.confirmPaymentIntent(intent.providerId)

    expect(confirmation.success).toBe(true)
    expect(confirmation.transaction?.paymentIntentId).toBe(intent.id)
  })

  it('supports refunds with stored transactions', async () => {
    const payment = await provider.processPayment(buildRequest())
    const refund = await provider.refundPayment({
      transactionId: payment.transaction!.id,
      amount: 3000,
      metadata: { originalTransactionId: payment.transaction!.id },
    })

    expect(refund.success).toBe(true)
    expect(refund.transaction?.status).toBe('refunded')
  })

  it('returns stored payment status when available', async () => {
    const payment = await provider.processPayment(buildRequest())
    const status = await provider.getPaymentStatus(payment.transaction!.id)

    expect(status.id).toBe(payment.transaction!.id)
    expect(status.status).toBe('completed')
  })
})
