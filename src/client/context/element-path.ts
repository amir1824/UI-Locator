// ponytail: PATH_STOP_IDS only knows common React mounts (`root`/`app`).
// Ceiling: paths stop early or never on other ids. Upgrade: configurable stop ids / always full path.
const PATH_STOP_IDS = new Set(['root', 'app'])

function segmentFor(element: Element): string {
  const tag = element.tagName.toLowerCase()
  if (element.id) return `${tag}#${element.id}`

  const className = typeof element.className === 'string' ? element.className.trim() : ''
  const firstClass = className.split(/\s+/).find(Boolean)
  if (firstClass) return `${tag}.${firstClass}`

  const parent = element.parentElement
  if (!parent) return tag
  const siblings = Array.from(parent.children).filter((child) => child.tagName === element.tagName)
  if (siblings.length <= 1) return tag
  return `${tag}:nth-of-type(${siblings.indexOf(element) + 1})`
}

/** CSS-ish path from element up to body / known mount id. */
export function buildElementPath(element: Element): string {
  const parts: string[] = []
  let current: Element | null = element
  while (current && current !== document.documentElement && current !== document.body) {
    parts.unshift(segmentFor(current))
    if (current.id && PATH_STOP_IDS.has(current.id)) break
    current = current.parentElement
  }
  return parts.join(' > ')
}
