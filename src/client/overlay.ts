import type { LocatorTheme } from '../shared/index.js'
import { LAYOUT, UI_IDS } from './overlay-styles.js'
import { buildTooltipText } from './tooltip-text.js'

const BADGE_LABEL_IDLE = 'Locator'
const BADGE_LABEL_PICKING = 'Picking — Esc'

const HIGHLIGHT_PADDING = 2
const TOOLTIP_CURSOR_OFFSET = 16
const FLASH_DURATION_MS = 1500
const FLASH_HORIZONTAL_OFFSET = 80
const FLASH_BOTTOM_OFFSET = 80

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
      top: `${rect.top - HIGHLIGHT_PADDING}px`,
      left: `${rect.left - HIGHLIGHT_PADDING}px`,
      width: `${rect.width + HIGHLIGHT_PADDING * 2}px`,
      height: `${rect.height + HIGHLIGHT_PADDING * 2}px`,
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
      top: `${y + TOOLTIP_CURSOR_OFFSET}px`,
      left: `${x + TOOLTIP_CURSOR_OFFSET}px`,
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
    source: string | undefined,
    x: number,
    y: number,
  ) => {
    showTooltip(buildTooltipText(source), el, x, y)
  }

  const flashMessage = (text: string) => {
    if (flashTimeout) clearTimeout(flashTimeout)
    const x = window.innerWidth / 2 - FLASH_HORIZONTAL_OFFSET
    const y = window.innerHeight - FLASH_BOTTOM_OFFSET
    showTooltip(text, null, x, y)
    flashTimeout = setTimeout(removeTooltip, FLASH_DURATION_MS)
  }

  const applyBadgeColors = (active: boolean) => {
    if (!badgeEl) return
    badgeEl.style.background = active ? theme.badgeActiveBackground : theme.badgeBackground
    badgeEl.style.color = active ? theme.badgeActiveText : theme.badgeText
    badgeEl.style.border = `1px solid ${active ? theme.badgeActiveBorder : theme.badgeBorder}`
  }

  const setPickActive = (active: boolean) => {
    document.body.style.cursor = active ? 'crosshair' : ''
    if (!badgeEl) return
    badgeEl.textContent = active ? BADGE_LABEL_PICKING : BADGE_LABEL_IDLE
    applyBadgeColors(active)
    if (!active) removeTooltip()
  }

  const dispose = () => {
    if (flashTimeout) clearTimeout(flashTimeout)
    flashTimeout = null
    removeTooltip()
  }

  const mountBadge = () => {
    badgeEl = document.createElement('button')
    badgeEl.id = UI_IDS.badge
    badgeEl.type = 'button'
    badgeEl.textContent = BADGE_LABEL_IDLE
    Object.assign(badgeEl.style, LAYOUT.badge)
    badgeEl.addEventListener('click', (event) => {
      event.stopPropagation()
      onTogglePick()
    })
    root.appendChild(badgeEl)
    applyBadgeColors(false)
  }

  return {
    mountBadge,
    setPickActive,
    showSourceTooltip,
    flashMessage,
    removeTooltip,
    dispose,
    getActiveEl: () => activeEl,
  }
}

export type LocatorOverlayUi = ReturnType<typeof createLocatorOverlayUi>
