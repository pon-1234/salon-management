/**
 * @design_doc   docs/REALTIME_CHAT_IMPLEMENTATION_PLAN.md
 * @related_to   RealtimeProvider and app/api/realtime/route.ts
 * @known_issues Browser reconnection timing is delegated to the native EventSource implementation
 */
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RealtimeProvider, useRealtimeRevision } from './realtime-context'

vi.mock('next-auth/react', () => ({
  useSession: () => ({ status: 'authenticated' }),
}))

class FakeEventSource {
  static instances: FakeEventSource[] = []
  readonly listeners = new Map<string, Set<EventListener>>()
  closed = false

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this)
  }

  addEventListener(type: string, listener: EventListener) {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>()
    listeners.add(listener)
    this.listeners.set(type, listeners)
  }

  removeEventListener(type: string, listener: EventListener) {
    this.listeners.get(type)?.delete(listener)
  }

  close() {
    this.closed = true
  }

  emit(type: string) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(new Event(type))
    }
  }
}

function RevisionConsumer() {
  return <span>{useRealtimeRevision()}</span>
}

describe('RealtimeProvider', () => {
  beforeEach(() => {
    FakeEventSource.instances = []
    vi.stubGlobal('EventSource', FakeEventSource)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shares one SSE connection and increments its revision on refresh events', () => {
    const { unmount } = render(
      <RealtimeProvider>
        <RevisionConsumer />
        <RevisionConsumer />
      </RealtimeProvider>
    )

    expect(FakeEventSource.instances).toHaveLength(1)
    expect(FakeEventSource.instances[0]?.url).toBe('/api/realtime')
    expect(screen.getAllByText('0')).toHaveLength(2)

    act(() => FakeEventSource.instances[0]?.emit('refresh'))

    expect(screen.getAllByText('1')).toHaveLength(2)
    unmount()
    expect(FakeEventSource.instances[0]?.closed).toBe(true)
  })
})
