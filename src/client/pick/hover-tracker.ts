export type HoverUpdate = (target: Element | null, x: number, y: number) => void

type HoverMove = { target: Element | null; x: number; y: number }

// Coalesce to one hover update per frame — a raw per-event handler can fall
// behind on fast mouse movement and leave the tooltip/highlight stale.
// Snapshot target/x/y synchronously rather than holding the Event itself:
// some DOM implementations (e.g. happy-dom) null out `event.target` once
// dispatch finishes, before the next animation frame runs.
export function createHoverTracker(updateHover: HoverUpdate) {
  let rafId: number | null = null
  let pendingMove: HoverMove | null = null
  let lastPoint: { x: number; y: number } | null = null

  const cancel = () => {
    if (rafId !== null) cancelAnimationFrame(rafId)
    rafId = null
    pendingMove = null
    lastPoint = null
  }

  const flush = () => {
    rafId = null
    const pending = pendingMove
    pendingMove = null
    if (pending) updateHover(pending.target, pending.x, pending.y)
  }

  const schedule = (move: HoverMove) => {
    pendingMove = move
    if (rafId === null) rafId = requestAnimationFrame(flush)
  }

  const onMouseMove = (event: MouseEvent) => {
    lastPoint = { x: event.clientX, y: event.clientY }
    schedule({ target: event.target as Element | null, x: event.clientX, y: event.clientY })
  }

  // Scroll/resize move the page under a stationary cursor: re-hit-test the last
  // known point so the highlight follows the element instead of going stale.
  const refresh = () => {
    if (!lastPoint) return
    const { x, y } = lastPoint
    schedule({ target: document.elementFromPoint(x, y), x, y })
  }

  return { onMouseMove, refresh, cancel }
}
