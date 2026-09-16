const PROMPT_ATTRS = new Set([
  'id',
  'class',
  'type',
  'name',
  'href',
  'role',
  'title',
  'placeholder',
  'alt',
  'for',
  'value',
  'aria-label',
])

const STYLE_KEYS = [
  'color',
  'backgroundColor',
  'fontSize',
  'fontFamily',
  'display',
  'position',
] as const

const TEXT_MAX = 80

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

export function readPromptAttributes(
  element: HTMLElement,
  sourceAttr: string,
): Record<string, string> {
  const attributes: Record<string, string> = {}
  for (const attr of Array.from(element.attributes)) {
    if (attr.name === sourceAttr) continue
    if (!PROMPT_ATTRS.has(attr.name) && !attr.name.startsWith('aria-')) continue
    attributes[attr.name] = attr.value
  }
  return attributes
}

function clampText(text: string): string {
  const collapsed = text.replace(/\s+/g, ' ').trim()
  if (!collapsed) return ''
  return collapsed.length > TEXT_MAX ? `${collapsed.slice(0, TEXT_MAX - 3)}...` : collapsed
}

export function ownText(element: HTMLElement): string | undefined {
  if (element.children.length > 0) {
    const label = element.getAttribute('aria-label')?.trim()
    return label || undefined
  }
  const text = clampText(element.innerText ?? '')
  return text || undefined
}

export function expandedText(element: HTMLElement): string | undefined {
  const text = clampText(element.innerText ?? '')
  return text || undefined
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;')
}

export function compactElementHtml(
  tag: string,
  attributes: Record<string, string>,
  text?: string,
): string {
  const attrStr = Object.entries(attributes)
    .map(([name, value]) => ` ${name}="${escapeAttr(value)}"`)
    .join('')
  if (text) return `<${tag}${attrStr}>${escapeText(text)}</${tag}>`
  return `<${tag}${attrStr}>`
}

export function readStyles(element: HTMLElement): Record<string, string> {
  const computed = window.getComputedStyle(element)
  const styles: Record<string, string> = {}
  for (const key of STYLE_KEYS) styles[key] = computed[key]
  return styles
}

export function readBox(element: HTMLElement): {
  top: number
  left: number
  width: number
  height: number
} {
  const rect = element.getBoundingClientRect()
  return {
    top: Math.round(rect.top),
    left: Math.round(rect.left),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  }
}
