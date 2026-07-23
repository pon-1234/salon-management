/**
 * @design_doc   Secret-free readiness projection for outbound notification providers
 * @related_to   config/env.ts, app/api/health/route.ts, email/client.ts, sms/client.ts
 * @known_issues Configuration presence cannot guarantee third-party network availability
 */
import { loadEnv } from '@/lib/config/env'

interface NotificationReadinessConfig {
  isProduction: boolean
  runtimeMode?: 'live' | 'preview'
  outbound?: { deliveryMode: 'provider' | 'disabled' }
  notification: { mockEnabled: boolean }
  resend: { apiKey: string; fromEmail: string }
  vonage: { apiKey: string; apiSecret: string; smsFrom: string }
}

type ProviderMode = 'provider' | 'mock' | 'disabled' | 'unconfigured'

interface ProviderReadiness {
  ready: boolean
  mode: ProviderMode
}

export interface NotificationReadiness {
  ready: boolean
  providers: {
    email: ProviderReadiness
    sms: ProviderReadiness
  }
}

function hasValue(value: string): boolean {
  return value.trim().length > 0
}

function providerReadiness(configured: boolean, mockAllowed: boolean): ProviderReadiness {
  if (configured) {
    return { ready: true, mode: 'provider' }
  }
  if (mockAllowed) {
    return { ready: true, mode: 'mock' }
  }
  return { ready: false, mode: 'unconfigured' }
}

export function getNotificationReadiness(
  config: NotificationReadinessConfig = loadEnv()
): NotificationReadiness {
  if (config.runtimeMode === 'preview' && config.outbound?.deliveryMode === 'disabled') {
    const disabled = { ready: true, mode: 'disabled' } as const
    return {
      ready: true,
      providers: { email: disabled, sms: disabled },
    }
  }

  const mockAllowed = !config.isProduction && config.notification.mockEnabled
  const email = providerReadiness(
    hasValue(config.resend.apiKey) && hasValue(config.resend.fromEmail),
    mockAllowed
  )
  const sms = providerReadiness(
    hasValue(config.vonage.apiKey) &&
      hasValue(config.vonage.apiSecret) &&
      hasValue(config.vonage.smsFrom),
    mockAllowed
  )

  return {
    ready: email.ready && sms.ready,
    providers: { email, sms },
  }
}
