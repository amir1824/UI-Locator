import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_IDE, STORAGE_KEY } from '../../src/shared/index.js'
import { badgeLabel, cycleStoredIde, getStoredIde, setStoredIde } from '../../src/client/preference.js'

describe('preference', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns default ide when storage is empty', () => {
    expect(getStoredIde()).toBe(DEFAULT_IDE)
  })

  it('persists and reads stored ide', () => {
    setStoredIde('vscode')
    expect(getStoredIde()).toBe('vscode')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('vscode')
  })

  it('falls back to default for invalid stored value', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid')
    expect(getStoredIde()).toBe(DEFAULT_IDE)
  })

  it('cycles through provided ide order', () => {
    setStoredIde('cursor')
    expect(cycleStoredIde(['cursor', 'vscode', 'webstorm'])).toBe('vscode')
    expect(getStoredIde()).toBe('vscode')
  })

  it('builds idle badge label', () => {
    setStoredIde('webstorm')
    expect(badgeLabel(false)).toBe('Source Locator (webstorm) — click to pick')
  })

  it('builds active badge label', () => {
    setStoredIde('vscode')
    expect(badgeLabel(true)).toBe('Pick element (vscode) — Esc to cancel')
  })
})
