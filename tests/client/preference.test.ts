import { describe, expect, it } from 'vitest'
import { badgeLabel } from '../../src/client/preference.js'

describe('badgeLabel', () => {
  it('builds idle badge label', () => {
    expect(badgeLabel(false)).toBe('Locator')
  })

  it('builds active badge label', () => {
    expect(badgeLabel(true)).toBe('Picking — Esc')
  })
})
