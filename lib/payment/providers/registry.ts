import { PaymentProvider } from './base'
import { StripeProvider, StripeConfig } from './stripe'
import { PaymentService } from '../service'

interface ProviderStatus {
  enabled: boolean
  reason?: string
}

type ProviderMap = Record<string, PaymentProvider>

type StatusMap = Record<string, ProviderStatus>

let providersCache: ProviderMap | null = null
let statusCache: StatusMap | null = null
let serviceCache: PaymentService | null = null

function buildStripeProvider(): { provider?: PaymentProvider; status: ProviderStatus } {
  const secretKey = (process.env.STRIPE_SECRET_KEY || '').trim()
  const publishableKey = (process.env.STRIPE_PUBLISHABLE_KEY || '').trim()

  if (!secretKey) {
    return {
      status: {
        enabled: false,
        reason: 'Stripe secret key is not configured',
      },
    }
  }

  const config: StripeConfig = {
    secretKey,
    publishableKey,
  }

  return {
    provider: new StripeProvider(config),
    status: {
      enabled: true,
    },
  }
}

function ensureInitialized() {
  if (providersCache && statusCache && serviceCache) {
    return
  }

  const providers: ProviderMap = {}
  const statuses: StatusMap = {}

  const { provider: stripeProvider, status: stripeStatus } = buildStripeProvider()
  statuses.stripe = stripeStatus
  if (stripeProvider) {
    providers[stripeProvider.name] = stripeProvider
  }

  providersCache = providers
  statusCache = statuses
  serviceCache = new PaymentService(providersCache)
}

export function getPaymentProviders(): ProviderMap {
  ensureInitialized()
  return providersCache as ProviderMap
}

export function getPaymentProviderStatus(): StatusMap {
  ensureInitialized()
  return statusCache as StatusMap
}

export function getPaymentService(): PaymentService {
  ensureInitialized()
  return serviceCache as PaymentService
}

export function isPaymentProviderEnabled(providerName: string): boolean {
  const statuses = getPaymentProviderStatus()
  return statuses[providerName]?.enabled ?? false
}

export function getPaymentProviderDisabledReason(providerName: string): string | undefined {
  const statuses = getPaymentProviderStatus()
  return statuses[providerName]?.reason
}

export function resetPaymentProviderRegistry() {
  providersCache = null
  statusCache = null
  serviceCache = null
}
