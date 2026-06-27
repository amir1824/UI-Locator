import { DEFAULT_IDE, parseSourceLocation, resolveTheme } from '../shared/index.js'
import type { LocatorThemeInput } from '../shared/index.js'
import { createLocatorOverlayUi } from './overlay.js'

export type ClientConfig = {
  endpoint: string
  attribute: string
  theme?: LocatorThemeInput
}

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

  const onClick = async (e: MouseEvent) => {
    if (!pickMode || host.contains(e.target as Element)) return
    e.preventDefault()
    e.stopPropagation()

    const el = getSourceEl(e.target as Element, config.attribute, host)
    if (!el) return
    syncSource(el)
    if (!componentSource) {
      ui.flashMessage('No source for this element')
      return
    }

    await openSourceInEditor(componentSource, config)
    ui.showSourceTooltip(el, componentSource, e.clientX, e.clientY)
  }

  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('click', onClick, true)
  ui.mountBadge()

  return () => {
    setPickMode(false)
    document.removeEventListener('keydown', onKeyDown)
    document.removeEventListener('click', onClick, true)
    ui.dispose()
  }
}
