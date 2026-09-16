import { describe, expect, it } from 'vitest'
import { buildTooltipText } from '../../src/client/overlay/tooltip-text.js'
import { expandedModifierLabel, isApplePlatform } from '../../src/client/platform.js'

describe('platform labels', () => {
  it('detects Apple platforms', () => {
    expect(isApplePlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe(true)
    expect(isApplePlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(false)
  })

  it('labels the expanded chord for Mac vs Windows', () => {
    expect(expandedModifierLabel('Macintosh')).toBe('Option+Shift')
    expect(expandedModifierLabel('Windows NT 10.0')).toBe('Alt+Shift')
  })
})

describe('buildTooltipText', () => {
  it('shows file path and Mac shortcut hints', () => {
    const text = buildTooltipText('src/App.tsx:10:1', 'Macintosh')
    expect(text).toContain('App.tsx:10')
    expect(text).toContain('Click → open · Shift+Click → copy · Option+Shift+Click → expanded')
  })

  it('shows Alt+Shift on Windows', () => {
    const text = buildTooltipText('src/App.tsx:10:1', 'Windows NT 10.0')
    expect(text).toContain('Alt+Shift+Click → expanded')
  })

  it('shows file name without line when line is 1', () => {
    const text = buildTooltipText('src/App.tsx:1:1', 'Macintosh')
    expect(text).toContain('App.tsx')
    expect(text).not.toContain('App.tsx:1')
  })

  it('shows message when source is missing', () => {
    expect(buildTooltipText(undefined)).toBe('No source for this element')
  })
})
