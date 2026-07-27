/**
 * @design_doc   Context-aware encoding for HTML notification bodies
 * @related_to   lib/email/client.ts, notification email composers
 * @known_issues This helper is for HTML text content; HTML attributes and URLs need contextual encoding
 */
const HTML_TEXT_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtmlText(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_TEXT_ENTITIES[character])
}
