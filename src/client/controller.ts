import { DEFAULT_IDE, parseSourceLocation, resolveTheme } from '../shared/index.js'
import type { LocatorThemeInput } from '../shared/index.js'
import { createLocatorOverlayUi } from './overlay.js'
import { UI_IDS } from './overlay-styles.js'

export type ClientConfig = {
  endpoint: string
  attribute: string
  theme?: LocatorThemeInput
}

function getSourceElement(
  target: Element | null,
  attribute: string,
  host: Element,
): HTMLElement | null {
  if (!target || host.contains(target) || target === host) return null
  const matched = target.closest(`[${attribute}]`)
  return matched instanceof HTMLElement ? matched : null
}

async function openSourceInEditor(source: string, config: ClientConfig): Promise<void> {
  const sourceLocation = parseSourceLocation(source)
  // Client always sends ide=auto; server resolveIde + plugin ides config pick the editor.
  const params = new URLSearchParams({
    file: sourceLocation.file,
    line: sourceLocation.line,
    col: sourceLocation.col,
    ide: DEFAULT_IDE,
  })
  await fetch(`${config.endpoint}?${params.toString()}`)
}

function readComponentSource(element: HTMLElement, attribute: string): string | undefined {
  return element.getAttribute(attribute) ?? undefined
}

/** Block page/dialog listeners without cancelling the browser's synthesized click. */
function blockPropagation(event: Event): void {
  event.stopPropagation()
  event.stopImmediatePropagation()
}

function stopEvent(event: Event): void {
  event.preventDefault()
  blockPropagation(event)
}

function pathIncludesHost(event: Event, host: Element): boolean {
  return event.composedPath().includes(host)
}

function pathIncludesBadge(event: Event): boolean {
  return event.composedPath().some(
    (node) => node instanceof Element && node.id === UI_IDS.badge,
  )
}

export function startPickController(root: ShadowRoot, host: Element, config: ClientConfig): () => void {
  let pickMode = false
  let componentSource: string | undefined
  const ui = createLocatorOverlayUi(root, resolveTheme(config.theme))

  function setPickMode(active: boolean) {
    document.removeEventListener('mousemove', onMouseMove)
    if (active) document.addEventListener('mousemove', onMouseMove)
    pickMode = active
    ui.setPickActive(active)
    if (!active) componentSource = undefined
  }

  const syncSource = (element: HTMLElement) => {
    if (element !== ui.getActiveEl()) {
      componentSource = readComponentSource(element, config.attribute)
    }
  }

  const updateHover = (target: Element | null, x: number, y: number) => {
    const element = getSourceElement(target, config.attribute, host)
    if (!element) {
      ui.removeTooltip()
      return
    }
    syncSource(element)
    ui.showSourceTooltip(element, componentSource, x, y)
  }

  const onMouseMove = (event: MouseEvent) => {
    updateHover(event.target as Element, event.clientX, event.clientY)
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
    syncSource(element)
    if (!componentSource) {
      ui.flashMessage('No source for this element')
      return
    }

    await openSourceInEditor(componentSource, config)
    ui.showSourceTooltip(element, componentSource, event.clientX, event.clientY)
  }

  // window capture runs before document capture dismissers (Radix/MUI).
  window.addEventListener('keydown', onKeyDown, true)
  window.addEventListener('pointerdown', onPointerDown, true)
  window.addEventListener('mousedown', onPointerDown, true)
  window.addEventListener('click', onClick, true)
  ui.mountBadge()

  return () => {
    setPickMode(false)
    window.removeEventListener('keydown', onKeyDown, true)
    window.removeEventListener('pointerdown', onPointerDown, true)
    window.removeEventListener('mousedown', onPointerDown, true)
    window.removeEventListener('click', onClick, true)
    ui.dispose()
  }
}
