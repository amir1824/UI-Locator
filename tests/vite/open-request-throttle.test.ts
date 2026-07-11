import { describe, expect, it } from 'vitest'
import { createOpenRequestThrottle } from '../../src/vite/open-request-throttle.js'

describe('createOpenRequestThrottle', () => {
  it('allows the first request for a location', () => {
    const shouldOpen = createOpenRequestThrottle()
    expect(shouldOpen('/app/src/App.tsx:1:1', 0)).toBe(true)
  })

  it('blocks a repeat request for the same location within the window', () => {
    const shouldOpen = createOpenRequestThrottle(500)
    expect(shouldOpen('/app/src/App.tsx:1:1', 1000)).toBe(true)
    expect(shouldOpen('/app/src/App.tsx:1:1', 1200)).toBe(false)
  })

  it('allows a repeat request once the window has elapsed', () => {
    const shouldOpen = createOpenRequestThrottle(500)
    expect(shouldOpen('/app/src/App.tsx:1:1', 1000)).toBe(true)
    expect(shouldOpen('/app/src/App.tsx:1:1', 1600)).toBe(true)
  })

  it('tracks each location independently', () => {
    const shouldOpen = createOpenRequestThrottle(500)
    expect(shouldOpen('/app/src/App.tsx:1:1', 1000)).toBe(true)
    expect(shouldOpen('/app/src/Other.tsx:1:1', 1050)).toBe(true)
  })
})
