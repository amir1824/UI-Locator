import type { LocatorIde } from '../shared/index.js'

const BADGE_PICKING_HINT = 'Esc to cancel'
const BADGE_IDLE_HINT = 'click to pick'

export function badgeLabel(picking: boolean, activeIde: LocatorIde): string {
  if (picking) return `Pick element (${activeIde}) — ${BADGE_PICKING_HINT}`
  return `Source Locator (${activeIde}) — ${BADGE_IDLE_HINT}`
}
