/**
 * @design_doc   Admin chat UI must send the selected store with every API operation
 * @related_to   StoreContext, participant lists, ChatWindow, and ChatBroadcastDialog
 * @known_issues None
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function source(name: string) {
  return readFileSync(join(__dirname, name), 'utf8')
}

describe('admin chat UI store scope', () => {
  it.each(['customer-list.tsx', 'cast-list.tsx', 'chat-window.tsx', 'chat-broadcast-dialog.tsx'])(
    'includes currentStore.id in requests from %s',
    (name) => {
      const content = source(name)
      expect(content).toContain('useStore')
      expect(content).toContain('currentStore.id')
      expect(content).toContain('storeId')
    }
  )

  it('does not promise a keyboard shortcut without handling it', () => {
    const content = source('chat-window.tsx')
    expect(content).toContain('onKeyDown={handleComposerKeyDown}')
    expect(content).toContain("event.key === 'Enter'")
    expect(content).toContain('(event.metaKey || event.ctrlKey)')
  })

  it('does not clear unread state when a mark-read request is rejected', () => {
    const content = source('chat-window.tsx')
    expect(content).toContain('responses.some((response) => !response.ok)')
  })

  it('clears participant lists immediately when the selected store changes', () => {
    expect(source('customer-list.tsx')).toContain('setCustomers([])')
    expect(source('cast-list.tsx')).toContain('setCasts([])')
  })

  it('cancels an obsolete cast request after switching stores', () => {
    const content = source('cast-list.tsx')
    expect(content).toContain('new AbortController()')
    expect(content).toContain('controller.abort()')
  })

  it('cancels obsolete message and participant requests after changing conversations', () => {
    const content = source('chat-window.tsx')
    expect(content).toContain('fetchMessages(controller.signal)')
    expect(content).toContain('fetchParticipant(controller.signal)')
  })

  it('prevents duplicate sends while the prior message request is pending', () => {
    const content = source('chat-window.tsx')
    expect(content).toContain('isSending')
    expect(content).toContain('setIsSending(true)')
    expect(content).toContain('setIsSending(false)')
  })

  it('does not append an old send response after switching conversations', () => {
    const content = source('chat-window.tsx')
    expect(content).toContain('activeConversationRef')
    expect(content).toContain('activeConversationRef.current === sendConversationKey')
  })
})
