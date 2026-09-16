import { DEFAULT_IDE } from '../../shared/index.js'
import {
  getElementContext,
  resolveSourceElement,
  writeContextPrompt,
} from '../context/context.js'
import type { ContextDetail, GetContextOptions, LocatorContext } from '../context/context.js'
import type { SelectBus } from './select-bus.js'

export type PickActionConfig = {
  endpoint: string
  attribute: string
  root?: string
}

export type PickUi = {
  flashMessage: (text: string) => void
  showSourceTooltip: (
    element: Element,
    source: string | undefined,
    x: number,
    y: number,
  ) => void
}

export function getSourceElement(
  target: Element | null,
  attribute: string,
  host: Element,
): HTMLElement | null {
  if (!target || host.contains(target) || target === host) return null
  return resolveSourceElement(target, attribute)
}

export async function openSourceInEditor(
  context: LocatorContext,
  config: PickActionConfig,
): Promise<void> {
  // Client always sends ide=auto; server resolveIde + plugin ides config pick the editor.
  const params = new URLSearchParams({
    file: context.source.file,
    line: String(context.source.line),
    col: String(context.source.column),
    ide: DEFAULT_IDE,
  })
  const response = await fetch(`${config.endpoint}?${params.toString()}`)
  if (!response.ok) {
    throw new Error(`Open failed with status ${response.status}`)
  }
}

export async function copySelection(input: {
  element: HTMLElement
  config: PickActionConfig
  detail: ContextDetail
  ui: PickUi
  bus: SelectBus
}): Promise<void> {
  const { element, config, detail, ui, bus } = input
  const context = getElementContext(element, {
    attribute: config.attribute,
    root: config.root,
    detail,
  })
  if (!context) {
    ui.flashMessage('No source for this element')
    return
  }
  try {
    await writeContextPrompt(context)
    bus.notify(context, 'copy')
    ui.flashMessage(detail === 'expanded' ? 'Copied expanded' : 'Copied for AI')
  } catch {
    ui.flashMessage('Copy failed')
  }
}

export async function openSelection(input: {
  element: HTMLElement
  config: PickActionConfig
  ui: PickUi
  bus: SelectBus
  clientX: number
  clientY: number
}): Promise<void> {
  const { element, config, ui, bus, clientX, clientY } = input
  const context = getElementContext(element, {
    attribute: config.attribute,
    root: config.root,
  })
  if (!context) {
    ui.flashMessage('No source for this element')
    return
  }
  const source = element.getAttribute(config.attribute) ?? undefined
  try {
    await openSourceInEditor(context, config)
    bus.notify(context, 'open')
    ui.showSourceTooltip(element, source, clientX, clientY)
  } catch {
    ui.flashMessage('Open failed')
  }
}

export function inspectElement(
  element: Element,
  config: PickActionConfig,
  options?: Pick<GetContextOptions, 'detail'>,
): LocatorContext | null {
  return getElementContext(element, {
    attribute: config.attribute,
    root: config.root,
    detail: options?.detail,
  })
}
