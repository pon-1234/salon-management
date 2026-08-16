/**
 * @design_doc   docs/PREVIEW_UAT_CHECKLIST.md management settings write-operation checks
 * @related_to   SettingsPage hides settings that have no persisted backend
 * @known_issues Mutual-link persistence and a public display surface are not implemented
 */
import { notFound } from 'next/navigation'

export default function MutualLinksPage() {
  notFound()
}
