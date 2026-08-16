/**
 * @design_doc   Reservation cancellation-source update boundary tests
 * @related_to   cancellation-source.ts and app/api/reservation/route.ts
 * @known_issues None currently
 */
import { describe, expect, it } from 'vitest'

import { resolveCancellationSourceUpdate } from './cancellation-source'

describe('resolveCancellationSourceUpdate', () => {
  it.each(['staff', null])('rejects unsupported cancellation source %j', (source) => {
    expect(
      resolveCancellationSourceUpdate({ status: 'cancelled', cancellationSource: source }, 'store')
    ).toEqual({ ok: false })
  })

  it('uses the actor default when a cancellation omits its source', () => {
    expect(resolveCancellationSourceUpdate({ status: 'cancelled' }, 'store')).toEqual({
      ok: true,
      value: 'store',
    })
  })

  it('keeps a supported explicit cancellation source', () => {
    expect(
      resolveCancellationSourceUpdate(
        { status: 'cancelled', cancellationSource: 'customer' },
        'store'
      )
    ).toEqual({ ok: true, value: 'customer' })
  })

  it.each([
    [{ cancellationSource: null }, null],
    [{ status: 'confirmed' }, null],
    [{}, undefined],
  ])('preserves non-cancellation clearing semantics for %j', (update, expected) => {
    expect(resolveCancellationSourceUpdate(update, 'store')).toEqual({
      ok: true,
      value: expected,
    })
  })
})
