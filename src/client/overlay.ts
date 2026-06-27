import { parseSourceLocation } from '../shared/index.js'
import type { ClickTarget, LocatorTheme } from '../shared/index.js'
import { badgeLabel } from './preference.js'

const UI_IDS = {
  badge: 'source-locator-badge',
  tooltip: 'source-locator-tooltip',
  highlight: 'source-locator-highlight',
} as const

const LAYOUT = {
  badge: {
    position: 'fixed',
    bottom: '12px',
    right: '12px',
    padding: '8px 12px',
    borderRadius: '999px',
    fontSize: '11px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    zIndex: '99999',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
  },
  tooltip: {
    position: 'fixed',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    zIndex: '99999',
    pointerEvents: 'none',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
    maxWidth: '420px',
    whiteSpace: 'pre',
    lineHeight: '1.5',
  },
  highlight: {
    position: 'fixed',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderRadius: '4px',
    pointerEvents: 'none',
    zIndex: '99998',
  },
} as const

function formatSourceLabel(source: string, prefix?: string): string {
  const { file, line } = parseSourceLocation(source)
  const name = file.split('/').pop() ?? file
  const label = line !== '1' ? `${name}:${line}` : name
  if (prefix) return `${prefix}: ${label}`
  return label
}

function buildTooltipText(
  tsxSource: string | undefined,
  cssSource: string | undefined,
  clickTarget: ClickTarget,
): string {
  const lines: string[] = []
  if (tsxSource) lines.push(formatSourceLabel(tsxSource, 'TSX'))
  if (cssSource) lines.push(formatSourceLabel(cssSource, 'CSS'))

  if (!cssSource) {
    lines.push('Click → open TSX')
    return lines.join('\n')
  }

  if (clickTarget === 'tsx') {
    lines.push('Click → open TSX')
    lines.push('Click again → open CSS')
    return lines.join('\n')
  }

  lines.push('Click → open CSS')
  lines.push('Click again → open TSX')
  return lines.join('\n')
}

export function createLocatorOverlayUi(
  root: ShadowRoot,
  onTogglePick: () => void,
  theme: LocatorTheme,
) {
  let activeEl: Element | null = null
  let flashTimeout: ReturnType<typeof setTimeout> | null = null
  let badgeEl: HTMLButtonElement | null = null

  const removeHighlight = () => root.getElementById(UI_IDS.highlight)?.remove()

  const removeTooltip = () => {
    root.getElementById(UI_IDS.tooltip)?.remove()
    activeEl = null
    removeHighlight()
  }

  const showHighlight = (el: Element) => {
    removeHighlight()
    const rect = el.getBoundingClientRect()
    const highlight = document.createElement('div')
    highlight.id = UI_IDS.highlight
    Object.assign(highlight.style, LAYOUT.highlight, {
      top: `${rect.top - 2}px`,
      left: `${rect.left - 2}px`,
      width: `${rect.width + 4}px`,
      height: `${rect.height + 4}px`,
      borderColor: theme.highlightBorder,
      background: theme.highlightBackground,
      boxShadow: `0 0 0 1px ${theme.highlightShadow}`,
    })
    root.appendChild(highlight)
  }

  const showTooltip = (text: string, el: Element | null, x: number, y: number) => {
    removeTooltip()
    const tooltip = document.createElement('div')
    tooltip.id = UI_IDS.tooltip
    tooltip.textContent = text
    Object.assign(tooltip.style, LAYOUT.tooltip, {
      top: `${y + 16}px`,
      left: `${x + 16}px`,
      background: theme.tooltipBackground,
      color: theme.tooltipText,
      border: `1px solid ${theme.tooltipBorder}`,
    })
    root.appendChild(tooltip)
    activeEl = el
    if (el) showHighlight(el)
  }

  const showSourceTooltip = (
    el: Element,
    tsxSource: string | undefined,
    cssSource: string | undefined,
    clickTarget: ClickTarget,
    x: number,
    y: number,
  ) => {
    showTooltip(buildTooltipText(tsxSource, cssSource, clickTarget), el, x, y)
  }

  const flashMessage = (text: string) => {
    if (flashTimeout) clearTimeout(flashTimeout)
    showTooltip(text, null, window.innerWidth / 2 - 80, window.innerHeight - 80)
    flashTimeout = setTimeout(removeTooltip, 1500)
  }

  const applyBadgeColors = (active: boolean) => {
    if (!badgeEl) return
    badgeEl.style.background = active ? theme.badgeActiveBackground : theme.badgeBackground
    badgeEl.style.color = active ? theme.badgeActiveText : theme.badgeText
  }

  const setPickActive = (active: boolean) => {
    document.body.style.cursor = active ? 'crosshair' : ''
    if (!badgeEl) return
    badgeEl.textContent = badgeLabel(active)
    applyBadgeColors(active)
    if (!active) removeTooltip()
  }

  const refreshBadgeLabel = () => {
    if (badgeEl) badgeEl.textContent = badgeLabel(false)
  }

  const mountBadge = () => {
    badgeEl = document.createElement('button')
    badgeEl.id = UI_IDS.badge
    badgeEl.type = 'button'
    badgeEl.textContent = badgeLabel(false)
    Object.assign(badgeEl.style, LAYOUT.badge, {
      background: theme.badgeBackground,
      color: theme.badgeText,
      border: `1px solid ${theme.badgeBorder}`,
    })
    badgeEl.addEventListener('click', (event) => {
      event.stopPropagation()
      onTogglePick()
    })
    root.appendChild(badgeEl)
  }

  return {
    mountBadge,
    setPickActive,
    refreshBadgeLabel,
    showSourceTooltip,
    flashMessage,
    removeTooltip,
    getActiveEl: () => activeEl,
  }
}

export type LocatorOverlayUi = ReturnType<typeof createLocatorOverlayUi>
