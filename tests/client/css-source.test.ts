import { beforeEach, describe, expect, it, vi } from 'vitest'
import { findCssSource } from '../../src/client/css-source.js'

describe('findCssSource', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.head.innerHTML = ''
  })

  it('returns undefined when no matching stylesheet exists', () => {
    const element = document.createElement('div')
    element.className = 'card'
    document.body.appendChild(element)

    expect(findCssSource(element)).toBeUndefined()
  })

  it('returns css source for matching project stylesheet rules', () => {
    const element = document.createElement('div')
    element.className = 'card'
    document.body.appendChild(element)

    const rule = Object.create(CSSStyleRule.prototype) as CSSStyleRule
    Object.defineProperty(rule, 'selectorText', { value: '.card' })

    const sheet = {
      href: 'http://localhost:5173/src/index.css',
      cssRules: [rule],
    }

    vi.spyOn(document, 'styleSheets', 'get').mockReturnValue([sheet as CSSStyleSheet])
    vi.spyOn(element, 'matches').mockReturnValue(true)

    const source = findCssSource(element)
    expect(source).toBe('/src/index.css:1:1')
  })

  it('ignores stylesheets without project css href', () => {
    const element = document.createElement('div')
    element.className = 'card'
    document.body.appendChild(element)

    const sheet = {
      href: 'https://cdn.example.com/styles.css',
      cssRules: [
        {
          constructor: CSSStyleRule,
          selectorText: '.card',
        },
      ],
    }

    vi.spyOn(document, 'styleSheets', 'get').mockReturnValue([sheet as CSSStyleSheet])

    expect(findCssSource(element)).toBeUndefined()
  })
})
