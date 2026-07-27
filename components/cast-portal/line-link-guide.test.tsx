/**
 * @design_doc   docs/ROUTING_STRUCTURE.md secure LINE cast registration flow
 * @related_to   CastLineLinkGuide explains the administrator-issued one-time command
 * @known_issues None
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CastLineLinkGuide } from './line-link-guide'

describe('CastLineLinkGuide', () => {
  it('never derives a registration command from a public cast identifier', () => {
    render(<CastLineLinkGuide />)

    expect(screen.queryByText(/reg\s+/i)).not.toBeInTheDocument()
    expect(screen.getAllByText(/管理者.*招待コマンド/).length).toBeGreaterThan(0)
  })
})
