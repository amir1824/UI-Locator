import { describe, expect, it } from 'vitest'
import {
  DEFAULT_IDE,
  IDE_ORDER,
  formatSourceLocation,
  isLocatorIde,
  nextClickTarget,
  parseSourceLocation,
  resolveIde,
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
    expect(isLocatorIde('auto')).toBe(true)
    expect(isLocatorIde('cursor')).toBe(true)
    expect(isLocatorIde('vscode')).toBe(true)
    expect(isLocatorIde('webstorm')).toBe(true)
  })

  it('rejects unknown values', () => {
    expect(isLocatorIde('sublime')).toBe(false)
  })
})

describe('resolveIde', () => {
  it('returns fallback for unknown values', () => {
    expect(resolveIde('unknown', ['vscode'])).toBe('vscode')
  })

  it('returns fallback when ide is not in allowed list', () => {
    expect(resolveIde('cursor', ['vscode'])).toBe('vscode')
  })

  it('returns resolved ide when allowed', () => {
    expect(resolveIde('vscode', ['auto', 'vscode'])).toBe('vscode')
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
    expect(IDE_ORDER).toEqual(['auto', 'cursor', 'vscode', 'webstorm'])
  })
})

describe('DEFAULT_IDE', () => {
  it('defaults to auto', () => {
    expect(DEFAULT_IDE).toBe('auto')
  })
})
