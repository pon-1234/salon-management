/**
 * @design_doc   Reservation workflow terminology agreed for field operation
 * @related_to   ViewToggle and InfoBar
 * @known_issues None
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { InfoBar } from './info-bar'
import { ViewToggle } from './view-toggle'

describe('reservation workflow labels', () => {
  it('uses reservation-list wording instead of the ambiguous ledger label', () => {
    render(<ViewToggle view="timeline" onViewChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: '予約一覧' })).toBeInTheDocument()
    expect(screen.queryByText('台帳')).not.toBeInTheDocument()
  })

  it('describes the real reservation workflow without calling it a simple booking', () => {
    render(<InfoBar selectedCustomer={null} />)

    expect(screen.getByText(/予約作成ができます/)).toBeInTheDocument()
    expect(screen.queryByText(/簡単予約/)).not.toBeInTheDocument()
  })
})
