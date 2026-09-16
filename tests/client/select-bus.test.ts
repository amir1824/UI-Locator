import { describe, expect, it, vi } from 'vitest'
import { createSelectBus } from '../../src/client/pick/select-bus.js'
import type { LocatorContext } from '../../src/client/context/context.js'

const sampleContext: LocatorContext = {
  source: { file: 'src/A.tsx', line: 1, column: 1 },
  element: { tag: 'div', html: '<div>', attributes: {} },
  page: { url: 'http://localhost/', pathname: '/' },
}

describe('createSelectBus', () => {
  it('isolates throwing handlers from siblings', () => {
    const bus = createSelectBus()
    const second = vi.fn()
    bus.onSelect(() => {
      throw new Error('boom')
    })
    bus.onSelect(second)

    bus.notify(sampleContext, 'open')
    expect(second).toHaveBeenCalledOnce()
  })

  it('stops notifying after unsubscribe', () => {
    const bus = createSelectBus()
    const handler = vi.fn()
    const unsubscribe = bus.onSelect(handler)
    unsubscribe()
    bus.notify(sampleContext, 'copy')
    expect(handler).not.toHaveBeenCalled()
  })
})
