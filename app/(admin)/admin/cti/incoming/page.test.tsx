/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md A-4
 * @related_to   InfiniTalk screen-popup URL landing page
 * @known_issues None
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import IncomingCallPage from './page'

describe('IncomingCallPage', () => {
  it('shows the InfiniTalk HTML popup URL that operators can register', () => {
    render(<IncomingCallPage />)

    expect(screen.getByRole('heading', { name: '着信ポップアップ' })).toBeInTheDocument()
    expect(screen.getByText(/telno=\{発信番号\}/)).toBeInTheDocument()
    expect(screen.getByText(/calledno=\{着信番号\}/)).toBeInTheDocument()
  })
})
