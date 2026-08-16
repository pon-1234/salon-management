/**
 * @design_doc   Reservation timeline navigation must never offer past booking dates
 * @related_to   DateNavigation and reservation-page-content
 * @known_issues None
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DateNavigation } from './date-navigation'

describe('DateNavigation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2030-07-21T12:00:00+09:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('disables navigation and calendar choices before today in Japan', () => {
    render(
      <DateNavigation selectedDate={new Date('2030-07-21T00:00:00+09:00')} onSelectDate={vi.fn()} />
    )

    expect(screen.getByRole('button', { name: '前の週へ' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /2030年07月21日/ }))

    expect(screen.getByRole('button', { name: /2030年7月20日/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /2030年7月21日/ })).toBeEnabled()
  })

  it('allows moving back from a future week but stops at the current week', () => {
    render(
      <DateNavigation selectedDate={new Date('2030-07-28T00:00:00+09:00')} onSelectDate={vi.fn()} />
    )

    const previousWeek = screen.getByRole('button', { name: '前の週へ' })
    expect(previousWeek).toBeEnabled()

    fireEvent.click(previousWeek)

    expect(screen.getByRole('button', { name: '21日(日)' })).toBeEnabled()
    expect(previousWeek).toBeDisabled()
  })
})
