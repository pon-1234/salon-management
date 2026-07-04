/**
 * @design_doc   ui-improvement-instructions.md U-1 toast wiring
 * @related_to   use-toast.ts, components/ui/toaster.tsx: global toast rendering
 * @known_issues UI visibility still requires root Toaster mounting
 */
import { describe, expect, it } from 'vitest'

import { reducer } from './use-toast'

type ToastAction = Parameters<typeof reducer>[1]

function addToast(id: string): ToastAction {
  return {
    type: 'ADD_TOAST',
    toast: {
      id,
      open: true,
      title: `toast-${id}`,
    },
  }
}

describe('use-toast reducer', () => {
  it('keeps the three newest toasts visible', () => {
    const state = [addToast('1'), addToast('2'), addToast('3'), addToast('4')].reduce(reducer, {
      toasts: [],
    })

    expect(state.toasts.map((toast) => toast.id)).toEqual(['4', '3', '2'])
  })
})
