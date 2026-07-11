// Guards against opening the same editor location twice in quick succession.
// A single logical click can otherwise reach the server twice (e.g. a fast
// double-click, or a retried fetch) and race two separate editor CLI spawns,
// which sometimes lose the "reuse last window" negotiation and each open a
// new window instead of one of them just focusing the existing one.
const REPEAT_OPEN_WINDOW_MS = 500

export function createOpenRequestThrottle(windowMs = REPEAT_OPEN_WINDOW_MS) {
  const lastOpenedAt = new Map<string, number>()

  return function shouldOpen(locationKey: string, now = Date.now()): boolean {
    const previous = lastOpenedAt.get(locationKey)
    lastOpenedAt.set(locationKey, now)
    return previous === undefined || now - previous > windowMs
  }
}
