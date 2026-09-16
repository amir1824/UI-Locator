export type HoverUpdate = (target: Element | null, x: number, y: number) => void

// Coalesce to one hover update per frame — a raw per-event handler can fall
// behind on fast mouse movement and leave the tooltip/highlight stale.
// Snapshot target/x/y synchronously rather than holding the Event itself:
// some DOM implementations (e.g. happy-dom) null out `event.target` once
// dispatch finishes, before the next animation frame runs.
export function createHoverTracker(updateHover: HoverUpdate) {
  let rafId: number | null = null
  let pendingMove: { target: Element | null; x: number; y: number } | null = null

  const cancel = () => {
    if (rafId !== null) cancelAnimationFrame(rafId)
    rafId = null
    pendingMove = null
  }

  const flush = () => {
    rafId = null
    const pending = pendingMove
    pendingMove = null
    if (pending) updateHover(pending.target, pending.x, pending.y)
  }

  const onMouseMove = (event: MouseEvent) => {
    pendingMove = {
      target: event.target as Element | null,
      x: event.clientX,
      y: event.clientY,
    }
    if (rafId === null) rafId = requestAnimationFrame(flush)
  }

  return { onMouseMove, cancel }
}
