import { PaymentProvider } from './base'
import { ManualPaymentProvider } from './manual'
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

function ensureInitialized() {
  if (providersCache && statusCache && serviceCache) {
    return
  }

  const manualProvider = new ManualPaymentProvider()

  providersCache = {
    [manualProvider.name]: manualProvider,
  }

  statusCache = {
    [manualProvider.name]: {
      enabled: true,
    },
  }

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
