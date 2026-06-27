export type {
  LocatorTheme,
  LocatorThemeInput,
  LocatorThemeOverride,
  LocatorThemePreset,
} from './theme.js'
export { resolveTheme } from './theme.js'

export type LocatorIde = 'cursor' | 'vscode' | 'webstorm'

export type SourceLocation = {
  file: string
  line: string
  col: string
}

export type ClickTarget = 'tsx' | 'css'

export const SOURCE_ATTR = 'data-source'
export const OPEN_ENDPOINT = '/__open-in-editor'
export const STORAGE_KEY = 'locator-ide'
export const DEFAULT_IDE: LocatorIde = 'cursor'
export const IDE_ORDER: LocatorIde[] = ['cursor', 'vscode', 'webstorm']

export function isLocatorIde(value: string): value is LocatorIde {
  return IDE_ORDER.includes(value as LocatorIde)
}

export function nextIde(current: LocatorIde, order: LocatorIde[] = IDE_ORDER): LocatorIde {
  const index = order.indexOf(current)
  const nextIndex = (index + 1) % order.length
  return order[nextIndex] ?? DEFAULT_IDE
}

export function parseSourceLocation(raw: string): SourceLocation {
  const parts = raw.split(':')
  const col = parts.pop()!
  const line = parts.pop()!
  const file = parts.join(':')
  return { file, line, col }
}

export function formatSourceLocation(loc: SourceLocation): string {
  return `${loc.file}:${loc.line}:${loc.col}`
}

export function nextClickTarget(current: ClickTarget, hasCss: boolean): ClickTarget {
  if (!hasCss) return 'tsx'
  return current === 'tsx' ? 'css' : 'tsx'
}
