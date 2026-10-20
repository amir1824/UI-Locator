export const TOOLTIP_CURSOR_OFFSET = 16
export const VIEWPORT_MARGIN = 8

export type Point = { x: number; y: number }
export type Size = { width: number; height: number }

// Prefer after the cursor (right / below), flip before it when that overflows,
// and pin to the margin when neither side has room (tiny viewports).
function placeOnAxis(cursor: number, size: number, viewport: number): number {
  const after = cursor + TOOLTIP_CURSOR_OFFSET
  if (after + size <= viewport - VIEWPORT_MARGIN) return after
  const before = cursor - TOOLTIP_CURSOR_OFFSET - size
  if (before >= VIEWPORT_MARGIN) return before
  return Math.max(VIEWPORT_MARGIN, viewport - VIEWPORT_MARGIN - size)
}

export function placeTooltip(cursor: Point, tooltip: Size, viewport: Size): { left: number; top: number } {
  return {
    left: placeOnAxis(cursor.x, tooltip.width, viewport.width),
    top: placeOnAxis(cursor.y, tooltip.height, viewport.height),
  }
}
