/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md A-4
 * @related_to   CTIProvider InfiniTalk HTML/URL popup push
 * @known_issues None
 */
import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CTIProvider } from './cti-provider'

const mocks = vi.hoisted(() => ({
  showIncomingCall: vi.fn(),
  closeIncomingCall: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  pathname: '/admin/reservation',
  search: '',
}))

vi.mock('@/hooks/use-cti', () => ({
  useCTI: () => ({
    incomingCall: null,
    closeIncomingCall: mocks.closeIncomingCall,
    showIncomingCall: mocks.showIncomingCall,
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
  usePathname: () => mocks.pathname,
  useSearchParams: () => new URLSearchParams(mocks.search),
}))

vi.mock('./incoming-call-popup', () => ({
  IncomingCallPopup: () => null,
}))

describe('CTIProvider', () => {
  beforeEach(() => {
    mocks.showIncomingCall.mockReset()
    mocks.closeIncomingCall.mockReset()
    mocks.push.mockReset()
    mocks.replace.mockReset()
    mocks.pathname = '/admin/reservation'
    mocks.search = ''
  })

  it('opens the current incoming overlay from InfiniTalk telno and calledno', async () => {
    mocks.search = 'telno=09012345678&calledno=0312345678&view=timeline'

    render(
      <CTIProvider>
        <div>admin</div>
      </CTIProvider>
    )

    await waitFor(() => {
      expect(mocks.showIncomingCall).toHaveBeenCalledWith('09012345678', '0312345678')
    })
    expect(mocks.replace).toHaveBeenCalledWith('/admin/reservation?view=timeline', {
      scroll: false,
    })
  })

  it('still accepts the legacy tel query used by the existing CTI trigger', async () => {
    mocks.search = 'tel=080-1111-2222'

    render(
      <CTIProvider>
        <div>admin</div>
      </CTIProvider>
    )

    await waitFor(() => {
      expect(mocks.showIncomingCall).toHaveBeenCalledWith('080-1111-2222', null)
    })
  })
})
