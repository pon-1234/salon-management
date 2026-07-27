/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md disposable preview target gate
 * @related_to   preview-safety.ts protects the preview persistence adapter before a transaction
 * @known_issues The database marker itself must be provisioned through an independently reviewed operation
 */
import { describe, expect, it } from 'vitest'
import { LEGACY_PREVIEW_ACKNOWLEDGEMENT, assertLegacyPreviewTarget } from './preview-safety'

const safeInput = {
  runtimeMode: 'preview',
  outboundDeliveryMode: 'disabled',
  databaseUrl: 'postgresql://preview_user:secret@preview-db:5432/salon_qa_preview?schema=public',
  expectedDatabaseName: 'salon_qa_preview',
  configuredMarker: '01JZ8QFQ05J6JNRQY3YW7M0V55',
  databaseMarker: '01JZ8QFQ05J6JNRQY3YW7M0V55',
  confirmedMarker: '01JZ8QFQ05J6JNRQY3YW7M0V55',
  databaseEnvironment: 'staging-preview',
  acknowledgement: LEGACY_PREVIEW_ACKNOWLEDGEMENT,
} as const

describe('assertLegacyPreviewTarget', () => {
  it('accepts only an explicitly marked disposable PostgreSQL preview database', () => {
    expect(assertLegacyPreviewTarget(safeInput)).toEqual({
      databaseName: 'salon_qa_preview',
      marker: '01JZ8QFQ05J6JNRQY3YW7M0V55',
    })
  })

  it.each([
    ['runtime mode', { runtimeMode: 'live' }],
    ['outbound delivery mode', { outboundDeliveryMode: 'live' }],
    ['acknowledgement', { acknowledgement: 'yes' }],
    ['database suffix', { expectedDatabaseName: 'salon_production' }],
    ['configured marker', { configuredMarker: '' }],
    ['database marker', { databaseMarker: 'different-marker' }],
    ['confirmed marker', { confirmedMarker: 'different-marker' }],
    ['database environment', { databaseEnvironment: 'production' }],
  ])('rejects an unsafe %s before persistence', (_, override) => {
    expect(() => assertLegacyPreviewTarget({ ...safeInput, ...override })).toThrow(
      /preview safety/i
    )
  })

  it('rejects a URL whose database does not exactly match the approved target name', () => {
    expect(() =>
      assertLegacyPreviewTarget({
        ...safeInput,
        databaseUrl: 'postgresql://preview_user:secret@preview-db:5432/other_preview',
      })
    ).toThrow(/preview safety/i)
  })

  it.each(['mysql://preview-db/salon_qa_preview', 'postgresql:///salon_qa_preview', 'not-a-url'])(
    'rejects an invalid target URL without exposing credentials: %s',
    (databaseUrl) => {
      let message = ''
      try {
        assertLegacyPreviewTarget({ ...safeInput, databaseUrl })
      } catch (error) {
        message = error instanceof Error ? error.message : String(error)
      }

      expect(message).toMatch(/preview safety/i)
      expect(message).not.toContain('secret')
    }
  )

  it.each([
    'postgresql://preview:secret@preview-db/salon_qa_preview?options=-c%20salon.environment%3Dstaging-preview',
    'postgresql://preview:secret@preview-db/salon_qa_preview?schema=private',
    'postgresql://preview:secret@preview-db/salon_qa_preview?schema=public&schema=public',
    'postgresql://preview:secret@preview-db/salon_qa_preview?connection_limit=10',
  ])(
    'rejects connection parameters that could change or obscure database identity: %s',
    (databaseUrl) => {
      expect(() => assertLegacyPreviewTarget({ ...safeInput, databaseUrl })).toThrow(
        /preview safety/i
      )
    }
  )
})
