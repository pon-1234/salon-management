/**
 * @design_doc   docs/VPS_DEPLOYMENT.md
 * @related_to   app/layout.tsx - Adds noindex metadata for the test domain
 * @known_issues Remove the blanket restriction only when a production domain is approved for indexing
 */
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', disallow: '/' }],
  }
}
