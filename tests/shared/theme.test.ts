import { describe, expect, it } from 'vitest'
import { resolveTheme } from '../../src/shared/theme.js'

describe('resolveTheme', () => {
  it('returns light theme when input is undefined', () => {
    const theme = resolveTheme()
    expect(theme.badgeBackground).toBe('#ffffff')
    expect(theme.badgeText).toBe('#111827')
    expect(theme.badgeActiveBorder).toBe('#2563eb')
  })

  it('applies preset themes', () => {
    const theme = resolveTheme('light')
    expect(theme.badgeBackground).toBe('#ffffff')
    expect(theme.badgeText).toBe('#111827')
    expect(theme.badgeActiveBackground).toBe('#ffffff')
    expect(theme.badgeActiveText).toBe('#2563eb')
  })

  it('merges custom overrides over light defaults', () => {
    const theme = resolveTheme({ background: '#111111', accent: '#ff0000' })
    expect(theme.badgeBackground).toBe('#111111')
    expect(theme.badgeText).toBe('#111827')
    expect(theme.tooltipText).toBe('#111827')
    expect(theme.badgeActiveBorder).toBe('#ff0000')
  })

  it('falls back to light for unknown preset', () => {
    const theme = resolveTheme('unknown' as 'default')
    expect(theme.badgeBackground).toBe('#ffffff')
  })
})
