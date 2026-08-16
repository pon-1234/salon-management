/**
 * @design_doc   Admin chat sidebar must scroll independently of the composer
 * @related_to   CustomerList, ChatPage viewport shell
 * @known_issues Presence remains display-only
 */
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CustomerList } from './customer-list'

vi.mock('@/contexts/store-context', () => ({
  useStore: () => ({ currentStore: { id: 'store-a' } }),
}))

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}))

describe('CustomerList sidebar layout', () => {
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

  it('scrolls the conversation list inside a bounded sidebar', async () => {
    render(<CustomerList selectedCustomerId={undefined} onSelectCustomer={vi.fn()} />)

    expect(screen.getByTestId('chat-customer-list')).toHaveClass('min-h-0', 'overflow-hidden')
    expect(screen.getByPlaceholderText('お客様名を検索...')).toBeInTheDocument()
    await waitFor(() => expect(fetch).toHaveBeenCalled())
  })
})
