import { describe, expect, it } from 'vitest'
import {
  DEFAULT_IDE,
  IDE_ORDER,
  formatSourceLocation,
  isLocatorIde,
  nextClickTarget,
  nextIde,
  parseSourceLocation,
} from '../../src/shared/index.js'

describe('parseSourceLocation', () => {
  it('parses unix paths', () => {
    expect(parseSourceLocation('/app/src/Button.tsx:10:5')).toEqual({
      file: '/app/src/Button.tsx',
      line: '10',
      col: '5',
    })
  })

  it('parses windows paths with drive letter', () => {
    expect(parseSourceLocation('C:\\project\\src\\App.tsx:10:5')).toEqual({
      file: 'C:\\project\\src\\App.tsx',
      line: '10',
      col: '5',
    })
  })
})

describe('formatSourceLocation', () => {
  it('joins file, line, and col', () => {
    expect(formatSourceLocation({ file: '/a.tsx', line: '2', col: '3' })).toBe('/a.tsx:2:3')
  })
})

describe('isLocatorIde', () => {
  it('accepts known ides', () => {
    expect(isLocatorIde('cursor')).toBe(true)
    expect(isLocatorIde('vscode')).toBe(true)
    expect(isLocatorIde('webstorm')).toBe(true)
  })

  it('rejects unknown values', () => {
    expect(isLocatorIde('sublime')).toBe(false)
  })
})

describe('nextIde', () => {
  it('cycles through the default order', () => {
    expect(nextIde('cursor')).toBe('vscode')
    expect(nextIde('vscode')).toBe('webstorm')
    expect(nextIde('webstorm')).toBe('cursor')
  })

  it('falls back to default when current is missing from order', () => {
    expect(nextIde(DEFAULT_IDE, ['vscode'])).toBe('vscode')
  })

  it('uses custom order', () => {
    expect(nextIde('vscode', ['vscode', 'cursor'])).toBe('cursor')
  })
})

describe('nextClickTarget', () => {
  it('stays on tsx when css is unavailable', () => {
    expect(nextClickTarget('tsx', false)).toBe('tsx')
    expect(nextClickTarget('css', false)).toBe('tsx')
  })

  it('toggles between tsx and css when css exists', () => {
    expect(nextClickTarget('tsx', true)).toBe('css')
    expect(nextClickTarget('css', true)).toBe('tsx')
  })
})

describe('IDE_ORDER', () => {
  it('includes all supported ides', () => {
    expect(IDE_ORDER).toEqual(['cursor', 'vscode', 'webstorm'])
  })
})
