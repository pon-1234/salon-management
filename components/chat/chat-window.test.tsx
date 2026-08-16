/**
 * @design_doc   Admin chat composer must stay reachable while the thread scrolls
 * @related_to   ChatWindow, ChatPage viewport shell
 * @known_issues Shared customer threads across stores remain a data-model constraint
 */
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ChatWindow } from './chat-window'

vi.mock('@/contexts/store-context', () => ({
  useStore: () => ({ currentStore: { id: 'store-a' } }),
}))

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}))

vi.mock('@/contexts/realtime-context', () => ({
  useRealtimeRevision: () => 0,
}))

describe('ChatWindow composer layout', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps the message field and send button in a compact footer', async () => {
    render(<ChatWindow participantType="customer" participantId="customer-1" />)

    expect(await screen.findByTestId('chat-composer')).toHaveClass('shrink-0')
    expect(screen.getByTestId('chat-message-pane')).toHaveClass('min-h-0', 'flex-1')
    expect(
      screen.getByPlaceholderText('顧客へメッセージを入力... (⌘/Ctrl + Enter で送信)')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'メッセージを送信' })).toBeInTheDocument()
    await waitFor(() => expect(fetch).toHaveBeenCalled())
  })
})
