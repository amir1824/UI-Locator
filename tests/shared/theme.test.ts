import { describe, expect, it } from 'vitest'
import { resolveTheme } from '../../src/shared/theme.js'

describe('resolveTheme', () => {
  it('returns default theme when input is undefined', () => {
    const theme = resolveTheme()
    expect(theme.badgeBackground).toBe('#0f172a')
    expect(theme.badgeText).toBe('#38bdf8')
  })

  it('applies preset themes', () => {
    const theme = resolveTheme('light')
    expect(theme.badgeBackground).toBe('#ffffff')
    expect(theme.badgeText).toBe('#2563eb')
  })

  it('merges custom overrides over default', () => {
    const theme = resolveTheme({ background: '#111111', accent: '#ff0000' })
    expect(theme.badgeBackground).toBe('#111111')
    expect(theme.badgeText).toBe('#ff0000')
    expect(theme.tooltipText).toBe('#f8fafc')
  })

  it('falls back to default for unknown preset', () => {
    const theme = resolveTheme('unknown' as 'default')
    expect(theme.badgeBackground).toBe('#0f172a')
  })
})
