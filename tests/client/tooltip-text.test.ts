import { describe, expect, it } from 'vitest'
import { buildTooltipText } from '../../src/client/tooltip-text.js'

describe('buildTooltipText', () => {
  it('shows file path and click hint when source exists', () => {
    const text = buildTooltipText('src/App.tsx:10:1')
    expect(text).toContain('App.tsx:10')
    expect(text).toContain('Click → open')
  })

  it('shows file name without line when line is 1', () => {
    const text = buildTooltipText('src/App.tsx:1:1')
    expect(text).toContain('App.tsx')
    expect(text).not.toContain('App.tsx:1')
  })

  it('shows message when source is missing', () => {
    expect(buildTooltipText(undefined)).toBe('No source for this element')
  })
})
