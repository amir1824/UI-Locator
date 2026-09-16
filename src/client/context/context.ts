import { SOURCE_ATTR, parseSourceLocation } from '../../shared/index.js'
import { buildElementPath } from './element-path.js'
import {
  compactElementHtml,
  expandedText,
  ownText,
  readBox,
  readPromptAttributes,
  readStyles,
} from './element-snapshot.js'
import type { ContextDetail, GetContextOptions, LocatorContext } from './types.js'

export type { ContextDetail, GetContextOptions, LocatorContext } from './types.js'

type DetailStrategy = {
  resolveText: (element: HTMLElement) => string | undefined
  textForHtml: (text: string | undefined) => string | undefined
  enrich: (context: LocatorContext, element: HTMLElement) => void
}

const DETAIL_STRATEGIES: Record<ContextDetail, DetailStrategy> = {
  compact: {
    resolveText: ownText,
    textForHtml: (text) => text,
    enrich: () => undefined,
  },
  expanded: {
    resolveText: expandedText,
    textForHtml: () => undefined,
    enrich: (context, element) => {
      context.path = buildElementPath(element)
      context.styles = readStyles(element)
      context.box = readBox(element)
    },
  },
}

function hasExpandedFields(context: LocatorContext): boolean {
  return Boolean(context.path || context.styles || context.box)
}

function normalizeRoot(root: string): string {
  return root.replace(/\\/g, '/').replace(/\/$/, '')
}

export function toProjectPath(file: string, root?: string): string {
  if (!root) return file
  const normalizedFile = file.replace(/\\/g, '/')
  const normalizedRoot = normalizeRoot(root)
  if (!normalizedFile.startsWith(`${normalizedRoot}/`) && normalizedFile !== normalizedRoot) {
    return file
  }
  return normalizedFile.slice(normalizedRoot.length + 1)
}

export function resolveSourceElement(
  element: Element,
  attribute: string = SOURCE_ATTR,
): HTMLElement | null {
  const matched = element.closest(`[${attribute}]`)
  return matched instanceof HTMLElement ? matched : null
}

function buildContext(
  sourceElement: HTMLElement,
  rawSource: string,
  options: GetContextOptions,
): LocatorContext {
  const strategy = DETAIL_STRATEGIES[options.detail ?? 'compact']
  const location = parseSourceLocation(rawSource)
  const attributes = readPromptAttributes(sourceElement, options.attribute ?? SOURCE_ATTR)
  const tag = sourceElement.tagName.toLowerCase()
  const text = strategy.resolveText(sourceElement)

  const context: LocatorContext = {
    source: {
      file: toProjectPath(location.file, options.root),
      line: Number(location.line) || 0,
      column: Number(location.col) || 0,
    },
    element: {
      tag,
      ...(text ? { text } : {}),
      html: compactElementHtml(tag, attributes, strategy.textForHtml(text)),
      attributes,
    },
    page: {
      url: window.location.href,
      pathname: window.location.pathname,
    },
  }
  strategy.enrich(context, sourceElement)
  return context
}

export function getElementContext(
  element: Element,
  options: GetContextOptions = {},
): LocatorContext | null {
  const attribute = options.attribute ?? SOURCE_ATTR
  const detail = options.detail ?? 'compact'
  const sourceElement = resolveSourceElement(element, attribute)
  if (!sourceElement) return null

  const raw = sourceElement.getAttribute(attribute)
  if (!raw) return null

  return buildContext(sourceElement, raw, { ...options, detail })
}

/** Compact by default; append Path/Text/Styles/Box when expanded fields exist. */
export function contextToPrompt(context: LocatorContext): string {
  const lines = [
    `Source: ${context.source.file}:${context.source.line}:${context.source.column}`,
    `Element: ${context.element.html}`,
  ]
  if (!hasExpandedFields(context)) return lines.join('\n')

  if (context.path) lines.push(`Path: ${context.path}`)
  if (context.element.text) lines.push(`Text: ${context.element.text}`)
  if (context.styles) {
    lines.push(
      `Styles: ${Object.entries(context.styles)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ')}`,
    )
  }
  if (context.box) {
    lines.push(
      `Box: ${context.box.width}x${context.box.height} @ (${context.box.left}, ${context.box.top})`,
    )
  }
  return lines.join('\n')
}

export async function writeContextPrompt(context: LocatorContext): Promise<void> {
  const write = navigator.clipboard?.writeText
  if (!write) throw new Error('Clipboard API unavailable')
  await write.call(navigator.clipboard, contextToPrompt(context))
}

export async function copyContextForAI(
  element: Element,
  options: GetContextOptions = {},
): Promise<LocatorContext | null> {
  const context = getElementContext(element, options)
  if (!context) return null
  await writeContextPrompt(context)
  return context
}
