import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const workflow = readFileSync(
  join(process.cwd(), '.github', 'workflows', 'prune-chat-attachments.yml'),
  'utf8'
)

describe('Prune Chat Attachments workflow', () => {
  it('can only be started manually', () => {
    expect(workflow).toMatch(/^\s*workflow_dispatch:/mu)
    expect(workflow).not.toMatch(/^\s*schedule:/mu)
  })

  it('passes explicit retention and production acknowledgement inputs to the script', () => {
    expect(workflow).toContain('CHAT_ATTACHMENT_RETENTION_DAYS: ${{ inputs.retention_days }}')
    expect(workflow).toContain(
      'CHAT_ATTACHMENT_PRUNE_ACKNOWLEDGEMENT: ${{ inputs.production_acknowledgement }}'
    )
  })
})
