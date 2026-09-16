import { transformSync } from '@babel/core'
import { describe, expect, it } from 'vitest'
import { babelPluginAddSourceAttr } from '../../src/vite/babel-plugin.js'

const ATTRIBUTE = 'data-source'

function transform(code: string, filename = '/app/src/Button.tsx') {
  return transformSync(code, {
    filename,
    parserOpts: { plugins: ['jsx', 'typescript'] },
    plugins: [[babelPluginAddSourceAttr, { attribute: ATTRIBUTE }]],
  })
}

describe('babelPluginAddSourceAttr', () => {
  it('adds data-source with file, line, and column', () => {
    const result = transform('<button>Click</button>')
    expect(result?.code).toMatch(/data-source="[^"]*Button\.tsx:1:1"/)
  })

  it('does not add duplicate attributes', () => {
    const code = `<button data-source="existing">Click</button>`
    const result = transform(code)
    const matches = result?.code?.match(/data-source/g) ?? []
    expect(matches).toHaveLength(1)
  })

  it('skips elements without source location', () => {
    const result = transformSync('<button>Click</button>', {
      parserOpts: { plugins: ['jsx'] },
      plugins: [[babelPluginAddSourceAttr, { attribute: ATTRIBUTE }]],
    })
    expect(result?.code).not.toContain('data-source')
  })

  it('does not add data-source to Fragment (React rejects unknown Fragment props)', () => {
    const result = transform('<Fragment key="x"><div /></Fragment>')
    expect(result?.code).not.toMatch(/<Fragment[^>]*data-source/)
    expect(result?.code).toMatch(/<div data-source/)
  })

  it('does not add data-source to React.Fragment', () => {
    const result = transform('<React.Fragment><div /></React.Fragment>')
    expect(result?.code).not.toMatch(/<React\.Fragment[^>]*data-source/)
    expect(result?.code).toMatch(/<div data-source/)
  })
})
