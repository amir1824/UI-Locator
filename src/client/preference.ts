import { DEFAULT_IDE, STORAGE_KEY, isLocatorIde, nextIde } from '../shared/index.js'
import type { LocatorIde } from '../shared/index.js'

export function getStoredIde(): LocatorIde {
  const stored = localStorage.getItem(STORAGE_KEY) ?? DEFAULT_IDE
  return isLocatorIde(stored) ? stored : DEFAULT_IDE
}

export function setStoredIde(ide: LocatorIde): void {
  localStorage.setItem(STORAGE_KEY, ide)
}

export function cycleStoredIde(order: LocatorIde[]): LocatorIde {
  const next = nextIde(getStoredIde(), order)
  setStoredIde(next)
  return next
}

const BADGE_PICKING_HINT = 'Esc to cancel'
const BADGE_IDLE_HINT = 'click to pick'

export function badgeLabel(picking: boolean): string {
  const ide = getStoredIde()
  if (picking) return `Pick element (${ide}) — ${BADGE_PICKING_HINT}`
  return `Source Locator (${ide}) — ${BADGE_IDLE_HINT}`
}
