import { UI_IDS } from '../overlay/styles.js'

/** Block page/dialog listeners without cancelling the browser's synthesized click. */
export function blockPropagation(event: Event): void {
  event.stopPropagation()
  event.stopImmediatePropagation()
}

export function stopEvent(event: Event): void {
  event.preventDefault()
  blockPropagation(event)
}

export function pathIncludesHost(event: Event, host: Element): boolean {
  return event.composedPath().includes(host)
}

export function pathIncludesBadge(event: Event): boolean {
  return event.composedPath().some(
    (node) => node instanceof Element && node.id === UI_IDS.badge,
  )
}
