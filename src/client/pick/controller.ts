import { resolveTheme } from '../../shared/index.js'
import type { LocatorThemeInput } from '../../shared/index.js'
import type { GetContextOptions, LocatorContext } from '../context/context.js'
import { createLocatorOverlayUi } from '../overlay/overlay.js'
import {
  copySelection,
  getSourceElement,
  inspectElement,
  openSelection,
} from './actions.js'
import {
  blockPropagation,
  pathIncludesBadge,
  pathIncludesHost,
  stopEvent,
} from './events.js'
import { createHoverTracker } from './hover-tracker.js'
import { createSelectBus } from './select-bus.js'
import type { SelectHandler } from './select-bus.js'

export type ClientConfig = {
  endpoint: string
  attribute: string
  theme?: LocatorThemeInput
  root?: string
}

export type PickController = {
  dispose: () => void
  onSelect: (handler: SelectHandler) => () => void
  inspect: (
    element: Element,
    options?: Pick<GetContextOptions, 'detail'>,
  ) => LocatorContext | null
}

export function startPickController(
  root: ShadowRoot,
  host: Element,
  config: ClientConfig,
): PickController {
  let pickMode = false
  const bus = createSelectBus()
  const ui = createLocatorOverlayUi(root, resolveTheme(config.theme))

  const updateHover = (target: Element | null, x: number, y: number) => {
    const element = getSourceElement(target, config.attribute, host)
    if (!element) {
      ui.removeTooltip()
      return
    }
    ui.showSourceTooltip(
      element,
      element.getAttribute(config.attribute) ?? undefined,
      x,
      y,
    )
  }

  const hover = createHoverTracker(updateHover)

  function setPickMode(active: boolean) {
    document.removeEventListener('mousemove', hover.onMouseMove)
    if (!active) {
      hover.cancel()
      pickMode = false
      ui.setPickActive(false)
      return
    }
    document.addEventListener('mousemove', hover.onMouseMove)
    pickMode = true
    ui.setPickActive(true)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !pickMode) return
    stopEvent(event)
    setPickMode(false)
  }

  const onPointerDown = (event: Event) => {
    if (pathIncludesHost(event, host)) {
      blockPropagation(event)
      return
    }
    if (!pickMode) return
    blockPropagation(event)
  }

  const onClick = async (event: MouseEvent) => {
    if (pathIncludesHost(event, host)) {
      stopEvent(event)
      if (pathIncludesBadge(event)) setPickMode(!pickMode)
      return
    }
    if (!pickMode) return
    stopEvent(event)

    const element = getSourceElement(event.target as Element, config.attribute, host)
    if (!element) return

    if (event.shiftKey) {
      await copySelection({
        element,
        config,
        detail: event.altKey ? 'expanded' : 'compact',
        ui,
        bus,
      })
      return
    }

    await openSelection({
      element,
      config,
      ui,
      bus,
      clientX: event.clientX,
      clientY: event.clientY,
    })
  }

  // window capture runs before document capture dismissers (Radix/MUI).
  window.addEventListener('keydown', onKeyDown, true)
  window.addEventListener('pointerdown', onPointerDown, true)
  window.addEventListener('mousedown', onPointerDown, true)
  window.addEventListener('click', onClick, true)
  ui.mountBadge()

  return {
    dispose: () => {
      setPickMode(false)
      bus.clear()
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('mousedown', onPointerDown, true)
      window.removeEventListener('click', onClick, true)
      ui.dispose()
    },
    onSelect: bus.onSelect,
    inspect: (element, options) => inspectElement(element, config, options),
  }
}
