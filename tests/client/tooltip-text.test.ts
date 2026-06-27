import { describe, expect, it } from 'vitest'
import { buildTooltipText } from '../../src/client/tooltip-text.js'

describe('buildTooltipText', () => {
  it('shows TSX-only hint when CSS is missing', () => {
    const text = buildTooltipText('src/App.tsx:10', undefined)
    expect(text).toContain('TSX: App.tsx:10')
    expect(text).toContain('Click → open TSX')
    expect(text).not.toContain('Shift+C')
  })

  it('includes Shift+C hint when CSS exists', () => {
    const text = buildTooltipText('src/App.tsx:10', 'src/App.css:5')
    expect(text).toContain('TSX: App.tsx:10')
    expect(text).toContain('CSS: App.css:5')
    expect(text).toContain('Click → open TSX')
    expect(text).toContain('Shift+C → CSS')
  })
})
