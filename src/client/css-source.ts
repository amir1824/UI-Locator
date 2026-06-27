import { formatSourceLocation } from '../shared/index.js'

function scoreSelector(selector: string, element: Element): number {
  let score = selector.length
  if (selector.includes('#')) score += 100
  if (selector.includes('.')) score += 50
  if (element instanceof HTMLElement) {
    element.classList.forEach((cls) => {
      if (selector.includes(`.${cls}`)) score += 200
    })
  }
  return score
}

function isProjectStylesheet(href: string): boolean {
  return href.includes('.css') && (href.includes('localhost') || href.includes('/src/'))
}

function hrefToFile(href: string): string {
  const url = new URL(href, window.location.origin)
  return decodeURIComponent(url.pathname)
}

export function findCssSource(element: Element): string | undefined {
  let bestScore = -1
  let bestFile: string | undefined

  Array.from(document.styleSheets).forEach((sheet) => {
    const href = sheet.href ?? ''
    if (!href || !isProjectStylesheet(href)) return

    let rules: CSSRuleList
    try {
      rules = sheet.cssRules
    } catch {
      return
    }

    Array.from(rules).forEach((rule) => {
      if (!(rule instanceof CSSStyleRule)) return
      try {
        if (!element.matches(rule.selectorText)) return
      } catch {
        return
      }
      const score = scoreSelector(rule.selectorText, element)
      if (score <= bestScore) return
      bestScore = score
      bestFile = hrefToFile(href)
    })
  })

  if (!bestFile) return undefined
  return formatSourceLocation({ file: bestFile, line: '1', col: '1' })
}
