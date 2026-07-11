import { DEFAULT_IDE, parseSourceLocation, resolveTheme } from '../shared/index.js'
import type { LocatorThemeInput } from '../shared/index.js'
import { createLocatorOverlayUi } from './overlay.js'

export type ClientConfig = {
  endpoint: string
  attribute: string
  theme?: LocatorThemeInput
}

// Dialogs/modals commonly close themselves on the *first* pointer interaction
// outside their content (mousedown/pointerdown), not on the later `click`.
// Swallowing only `click` (the old behavior) let that outside-click-close logic
// run first and unmount the dialog before pick mode ever saw the interaction.
// Capturing this whole event family on `window` — the first node visited during
// the capture phase — pre-empts any such listener regardless of where or when it
// was attached.
const SWALLOWED_EVENT_TYPES = ['mousedown', 'mouseup', 'pointerup', 'click'] as const

function getSourceEl(target: Element | null, attribute: string, host: Element): HTMLElement | null {
  if (!target || host.contains(target) || target === host) return null
  const el = target.closest(`[${attribute}]`)
  return el instanceof HTMLElement ? el : null
}

async function openSourceInEditor(source: string, config: ClientConfig): Promise<void> {
  const loc = parseSourceLocation(source)
  // Client always sends ide=auto; server resolveIde + plugin ides config pick the editor.
  const params = new URLSearchParams({
    file: loc.file,
    line: loc.line,
    col: loc.col,
    ide: DEFAULT_IDE,
  })
  await fetch(`${config.endpoint}?${params.toString()}`)
}

function readComponentSource(el: HTMLElement, attribute: string): string | undefined {
  return el.getAttribute(attribute) ?? undefined
}

export function startPickController(root: ShadowRoot, host: Element, config: ClientConfig): () => void {
  let pickMode = false
  let componentSource: string | undefined
  let openRequestInFlight = false
  const ui = createLocatorOverlayUi(root, () => setPickMode(!pickMode), resolveTheme(config.theme))

  function setPickMode(active: boolean) {
    if (active) document.addEventListener('mousemove', onMouseMove)
    else document.removeEventListener('mousemove', onMouseMove)
    pickMode = active
    ui.setPickActive(active)
    if (!active) componentSource = undefined
  }

  const syncSource = (el: HTMLElement) => {
    if (el !== ui.getActiveEl()) componentSource = readComponentSource(el, config.attribute)
  }

  const updateHover = (target: Element | null, x: number, y: number) => {
    const el = getSourceEl(target, config.attribute, host)
    if (!el) {
      ui.removeTooltip()
      return
    }
    syncSource(el)
    ui.showSourceTooltip(el, componentSource, x, y)
  }

  const onMouseMove = (e: MouseEvent) => {
    updateHover(e.target as Element, e.clientX, e.clientY)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && pickMode) setPickMode(false)
  }

  const isOutsideHostWhilePicking = (e: Event): boolean => pickMode && !host.contains(e.target as Element)

  const pickElement = async (el: HTMLElement, x: number, y: number) => {
    if (openRequestInFlight) return
    syncSource(el)
    if (!componentSource) {
      ui.flashMessage('No source for this element')
      return
    }

    openRequestInFlight = true
    try {
      await openSourceInEditor(componentSource, config)
      ui.showSourceTooltip(el, componentSource, x, y)
    } finally {
      openRequestInFlight = false
    }
  }

  const onPointerDown = (e: PointerEvent) => {
    if (!isOutsideHostWhilePicking(e)) return
    e.preventDefault()
    e.stopPropagation()

    const el = getSourceEl(e.target as Element, config.attribute, host)
    if (!el) return
    void pickElement(el, e.clientX, e.clientY)
  }

  // The pick action itself already ran on `pointerdown`; these later events in
  // the same interaction (mousedown, mouseup, click, ...) only need to be
  // swallowed so nothing underneath — a dialog, a link, a button — reacts to them.
  const swallowRestOfInteraction = (e: Event) => {
    if (!isOutsideHostWhilePicking(e)) return
    e.preventDefault()
    e.stopPropagation()
  }

  document.addEventListener('keydown', onKeyDown)
  window.addEventListener('pointerdown', onPointerDown, true)
  for (const type of SWALLOWED_EVENT_TYPES) {
    window.addEventListener(type, swallowRestOfInteraction, true)
  }
  ui.mountBadge()

  return () => {
    setPickMode(false)
    document.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('pointerdown', onPointerDown, true)
    for (const type of SWALLOWED_EVENT_TYPES) {
      window.removeEventListener(type, swallowRestOfInteraction, true)
    }
    ui.dispose()
  }
}
