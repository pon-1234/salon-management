/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md A-6, F-2, J-9
 * @related_to   RealtimeProvider, chat panels, NotificationProvider, AuthProvider
 * @known_issues Source contracts supplement behavior tests for the shared SSE connection
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8')
}

describe('phase 4 realtime integration', () => {
  it.each([
    'components/chat/chat-window.tsx',
    'components/chat/simple-chat-panel.tsx',
    'contexts/notification-context.tsx',
  ])('%s refreshes from the shared realtime revision without timers', (path) => {
    const contents = source(path)

    expect(contents).toContain('useRealtimeRevision')
    expect(contents).not.toContain('setInterval(')
  })

  it('disables redundant NextAuth polling and focus refetches', () => {
    const contents = source('contexts/auth-context.tsx')

    expect(contents).toContain('refetchInterval={0}')
    expect(contents).toContain('refetchOnWindowFocus={false}')
  })
})
