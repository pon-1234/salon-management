/**
 * @design_doc   ui-improvement-instructions.md U-4 destructive action confirmation
 * @related_to   confirm-dialog.tsx: shared AlertDialog wrapper for delete/expire actions
 * @known_issues Visual variants are verified manually in admin settings pages
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from './confirm-dialog'

describe('ConfirmDialog', () => {
  it('calls onConfirm only after the user confirms', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const onConfirm = vi.fn()

    render(
      <ConfirmDialog
        title="削除しますか？"
        description="この操作は取り消せません。"
        onConfirm={onConfirm}
      >
        <Button>削除</Button>
      </ConfirmDialog>
    )

    await user.click(screen.getByRole('button', { name: '削除' }))
    expect(onConfirm).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '実行する' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
