import { describe, expect, it } from 'vitest'
import {
  TOOLTIP_CURSOR_OFFSET,
  VIEWPORT_MARGIN,
  placeTooltip,
} from '../../src/client/overlay/tooltip-position.js'

const VIEWPORT = { width: 1280, height: 800 }
const TOOLTIP = { width: 300, height: 60 }

describe('placeTooltip', () => {
  it('sits below-right of the cursor when there is room', () => {
    expect(placeTooltip({ x: 100, y: 100 }, TOOLTIP, VIEWPORT)).toEqual({
      left: 100 + TOOLTIP_CURSOR_OFFSET,
      top: 100 + TOOLTIP_CURSOR_OFFSET,
    })
  })

  it('flips left of the cursor near the right edge', () => {
    expect(placeTooltip({ x: 1200, y: 100 }, TOOLTIP, VIEWPORT).left).toBe(
      1200 - TOOLTIP_CURSOR_OFFSET - TOOLTIP.width,
    )
  })

  it('flips above the cursor near the bottom edge', () => {
    expect(placeTooltip({ x: 100, y: 780 }, TOOLTIP, VIEWPORT).top).toBe(
      780 - TOOLTIP_CURSOR_OFFSET - TOOLTIP.height,
    )
  })

  it('pins to the margin when neither side of the cursor fits (phone width)', () => {
    expect(placeTooltip({ x: 150, y: 100 }, { width: 340, height: 60 }, { width: 375, height: 812 }).left).toBe(
      375 - VIEWPORT_MARGIN - 340,
    )
  })

  it('never goes past the left margin when the tooltip is wider than the viewport', () => {
    expect(placeTooltip({ x: 50, y: 100 }, { width: 400, height: 60 }, { width: 280, height: 600 }).left).toBe(
      VIEWPORT_MARGIN,
    )
  })
})
