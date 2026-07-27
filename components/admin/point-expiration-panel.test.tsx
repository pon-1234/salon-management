/**
 * @design_doc   docs/VPS_DEPLOYMENT.md point-expiration fail-closed policy
 * @related_to   PointExpirationPanel shows the production safety gate
 * @known_issues FIFO point-lot allocation and legacy reconciliation are not approved
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PointExpirationPanel } from './point-expiration-panel'

describe('PointExpirationPanel', () => {
  it('does not expose a manual expiration action before FIFO reconciliation is approved', () => {
    vi.stubGlobal('fetch', vi.fn())

    render(<PointExpirationPanel />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText(/FIFO/)).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })
})
