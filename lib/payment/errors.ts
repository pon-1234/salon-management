export class PaymentProviderUnavailableError extends Error {
  constructor(providerName: string, reason?: string) {
    super(
      reason
        ? `Payment provider ${providerName} is unavailable: ${reason}`
        : `Payment provider ${providerName} is unavailable`
    )
    this.name = 'PaymentProviderUnavailableError'
  }
}

export class PaymentProviderNotFoundError extends Error {
  constructor(providerName: string) {
    super(`Payment provider ${providerName} not supported`)
    this.name = 'PaymentProviderNotFoundError'
  }
}
