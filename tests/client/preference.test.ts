import { describe, expect, it } from 'vitest'
import { badgeLabel } from '../../src/client/preference.js'

describe('badgeLabel', () => {
  it('builds idle badge label', () => {
    expect(badgeLabel(false, 'webstorm')).toBe('Source Locator (webstorm) — click to pick')
  })

  it('builds active badge label', () => {
    expect(badgeLabel(true, 'vscode')).toBe('Pick element (vscode) — Esc to cancel')
  })

  it('shows auto in badge label', () => {
    expect(badgeLabel(false, 'auto')).toBe('Source Locator (auto) — click to pick')
  })
})
