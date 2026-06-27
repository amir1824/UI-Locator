import { DEFAULT_IDE, nextClickTarget, parseSourceLocation, resolveTheme } from '../shared/index.js'
import type { ClickTarget, LocatorThemeInput } from '../shared/index.js'
import { findCssSource } from './css-source.js'
import { createLocatorOverlayUi } from './overlay.js'

export type ClientConfig = {
  endpoint: string
  attribute: string
  theme?: LocatorThemeInput
}

type ElementSources = {
  tsx: string | undefined
  css: string | undefined
  clickTarget: ClickTarget
}

const EMPTY_SOURCES: ElementSources = Object.freeze({
  tsx: undefined,
  css: undefined,
  clickTarget: 'tsx',
})

function getSourceEl(target: Element | null, attribute: string, host: Element): HTMLElement | null {
  if (!target || host.contains(target) || target === host) return null
  const el = target.closest(`[${attribute}]`)
  return el instanceof HTMLElement ? el : null
}

async function openSourceInEditor(source: string, config: ClientConfig): Promise<void> {
  const loc = parseSourceLocation(source)
  const params = new URLSearchParams({
    file: loc.file,
    line: loc.line,
    col: loc.col,
    ide: DEFAULT_IDE,
  })
  await fetch(`${config.endpoint}?${params.toString()}`)
}

function readElementSources(el: HTMLElement, attribute: string): ElementSources {
  const tsx = el.getAttribute(attribute) ?? undefined
  const css = findCssSource(el)
  return { tsx, css, clickTarget: 'tsx' }
}

function resolveOpenSource(sources: ElementSources): string | undefined {
  return sources[sources.clickTarget]
}

export function startPickController(root: ShadowRoot, host: Element, config: ClientConfig): () => void {
  let pickMode = false
  let sources: ElementSources = EMPTY_SOURCES
  const ui = createLocatorOverlayUi(root, () => setPickMode(!pickMode), resolveTheme(config.theme))

  function setPickMode(active: boolean) {
    pickMode = active
    ui.setPickActive(active)
    if (!active) sources = EMPTY_SOURCES
  }

  const syncSources = (el: HTMLElement) => {
    if (el !== ui.getActiveEl()) sources = readElementSources(el, config.attribute)
  }

  const updateHover = (target: Element | null, x: number, y: number) => {
    const el = getSourceEl(target, config.attribute, host)
    if (!el) {
      ui.removeTooltip()
      return
    }
    syncSources(el)
    ui.showSourceTooltip(el, sources.tsx, sources.css, x, y)
  }

  const onMouseMove = (e: MouseEvent) => {
    if (!pickMode) {
      ui.removeTooltip()
      return
    }
    updateHover(e.target as Element, e.clientX, e.clientY)
  }

  const onKeyDown = async (e: KeyboardEvent) => {
    if (e.key === 'Escape' && pickMode) {
      setPickMode(false)
      return
    }
    if (e.shiftKey && e.key === 'C' && pickMode) {
      const el = ui.getActiveEl()
      if (!(el instanceof HTMLElement)) return
      syncSources(el)
      if (!sources.css) {
        ui.flashMessage('No CSS for this element')
        return
      }
      await openSourceInEditor(sources.css, config)
      return
    }
  }

  const onClick = async (e: MouseEvent) => {
    if (!pickMode || host.contains(e.target as Element)) return
    e.preventDefault()
    e.stopPropagation()

    const el = getSourceEl(e.target as Element, config.attribute, host)
    if (el) syncSources(el)
    const openSource = el && resolveOpenSource(sources)
    if (!el || !openSource) {
      ui.flashMessage('No source for this element')
      return
    }

    await openSourceInEditor(openSource, config)
    sources = { ...sources, clickTarget: nextClickTarget(sources.clickTarget, !!sources.css) }
    ui.showSourceTooltip(el, sources.tsx, sources.css, e.clientX, e.clientY)
  }

  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('click', onClick, true)
  ui.mountBadge()

  return () => {
    document.removeEventListener('keydown', onKeyDown)
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('click', onClick, true)
  }
}
