import type { LocatorTheme } from '../../shared/index.js'
import { LAYOUT, UI_IDS } from './styles.js'
import { placeTooltip } from './tooltip-position.js'
import { buildTooltipText } from './tooltip-text.js'

const BADGE_LABEL_IDLE = 'Locator'
const BADGE_LABEL_PICKING = 'Picking — Esc'

const HIGHLIGHT_PADDING = 2
const FLASH_DURATION_MS = 1500
const FLASH_HORIZONTAL_OFFSET = 80
const FLASH_BOTTOM_OFFSET = 80

export function createLocatorOverlayUi(root: ShadowRoot, theme: LocatorTheme) {
  let flashTimeout: ReturnType<typeof setTimeout> | null = null
  let badgeEl: HTMLButtonElement | null = null
  let previousCursor: string | null = null

  const removeHighlight = () => root.getElementById(UI_IDS.highlight)?.remove()
  const removeTooltipNode = () => root.getElementById(UI_IDS.tooltip)?.remove()

  const removeTooltip = () => {
    removeTooltipNode()
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

  const showTooltip = (text: string, x: number, y: number): HTMLDivElement => {
    removeTooltipNode()
    const tooltip = document.createElement('div')
    tooltip.id = UI_IDS.tooltip
    tooltip.textContent = text
    Object.assign(tooltip.style, LAYOUT.tooltip, {
      top: '0px',
      left: '0px',
      background: theme.tooltipBackground,
      color: theme.tooltipText,
      border: `1px solid ${theme.tooltipBorder}`,
    })
    root.appendChild(tooltip)
    positionTooltip(tooltip, { x, y })
    return tooltip
  }

  // Measured after mount: the size depends on the wrapped text. clientWidth/Height
  // exclude the page scrollbar, so the tooltip never tucks under it.
  const positionTooltip = (tooltip: HTMLElement, cursor: { x: number; y: number }) => {
    const { width, height } = tooltip.getBoundingClientRect()
    const viewport = {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    }
    const { left, top } = placeTooltip(cursor, { width, height }, viewport)
    tooltip.style.left = `${left}px`
    tooltip.style.top = `${top}px`
  }

  const showSourceTooltip = (
    el: Element,
    source: string | undefined,
    x: number,
    y: number,
  ) => {
    showTooltip(buildTooltipText(source), x, y)
    showHighlight(el)
  }

  // The flash replaces only the tooltip text and keeps the element highlight. Its
  // timeout removes the flash node itself, never a hover tooltip that replaced it.
  const flashMessage = (text: string) => {
    if (flashTimeout) clearTimeout(flashTimeout)
    const x = window.innerWidth / 2 - FLASH_HORIZONTAL_OFFSET
    const y = window.innerHeight - FLASH_BOTTOM_OFFSET
    const flash = showTooltip(text, x, y)
    flashTimeout = setTimeout(() => flash.remove(), FLASH_DURATION_MS)
  }

  const applyBadgeColors = (active: boolean) => {
    if (!badgeEl) return
    badgeEl.style.background = active ? theme.badgeActiveBackground : theme.badgeBackground
    badgeEl.style.color = active ? theme.badgeActiveText : theme.badgeText
    badgeEl.style.border = `1px solid ${active ? theme.badgeActiveBorder : theme.badgeBorder}`
  }

  const setPickActive = (active: boolean) => {
    if (!active) {
      // Only restore when we actually swapped the cursor — dispose always
      // deactivates pick mode, and writing '' would wipe an app cursor like `wait`.
      if (previousCursor !== null) {
        document.body.style.cursor = previousCursor
        previousCursor = null
      }
      removeTooltip()
      if (!badgeEl) return
      badgeEl.textContent = BADGE_LABEL_IDLE
      applyBadgeColors(false)
      return
    }
    previousCursor = document.body.style.cursor
    document.body.style.cursor = 'crosshair'
    if (!badgeEl) return
    badgeEl.textContent = BADGE_LABEL_PICKING
    applyBadgeColors(true)
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
  }
}

export type LocatorOverlayUi = ReturnType<typeof createLocatorOverlayUi>
