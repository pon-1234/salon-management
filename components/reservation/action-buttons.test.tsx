/**
 * @design_doc   Admin reservation creation permission boundary
 * @related_to   ActionButtons and CustomerSelectionDialog
 * @known_issues None
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ActionButtons } from './action-buttons'

const customerDialogMock = vi.hoisted(() =>
  vi.fn(({ open }: { open: boolean }) =>
    open ? <div data-testid="customer-selection-dialog">顧客選択</div> : null
  )
)

vi.mock('@/components/customer/customer-selection-dialog', () => ({
  CustomerSelectionDialog: customerDialogMock,
}))

describe('ActionButtons reservation permissions', () => {
  it('keeps read-only timeline controls but hides customer booking without create permission', () => {
    render(
      <ActionButtons
        canCreateReservation={false}
        onRefresh={vi.fn()}
        onFilter={vi.fn()}
        onCustomerSelect={vi.fn()}
        selectedCustomer={null}
      />
    )

    expect(screen.getByRole('button', { name: '更新' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'フィルター' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'この顧客で予約を取る' })).not.toBeInTheDocument()
    expect(customerDialogMock).not.toHaveBeenCalled()
  })

  it('opens customer selection when reservation creation is permitted', () => {
    render(
      <ActionButtons
        canCreateReservation
        onRefresh={vi.fn()}
        onFilter={vi.fn()}
        onCustomerSelect={vi.fn()}
        selectedCustomer={null}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'この顧客で予約を取る' }))

    expect(screen.getByTestId('customer-selection-dialog')).toBeInTheDocument()
  })
})
