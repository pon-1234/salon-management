/**
 * @design_doc   ui-improvement-instructions.md U-8 login redirect consistency
 * @related_to   LoginForm: customer redirect consumer; StoreScheduleContent: callbackUrl producer
 * @known_issues Route existence is not validated here; callers choose an appropriate fallback
 */
type SanitizeCallbackUrlOptions = {
  fallback: string
}

export function sanitizeCallbackUrl(
  value: string | null | undefined,
  { fallback }: SanitizeCallbackUrlOptions
) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return fallback
  }

  return value
}
