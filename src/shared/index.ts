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
  if (parts.length < 3) return { file: raw, line: '1', col: '1' }
  const col = parts.pop() ?? '1'
  const line = parts.pop() ?? '1'
  return { file: parts.join(':'), line, col }
}

export function formatSourceLocation(loc: SourceLocation): string {
  return `${loc.file}:${loc.line}:${loc.col}`
}

const CLICK_TARGET_TRANSITION: Record<ClickTarget, ClickTarget> = {
  tsx: 'css',
  css: 'tsx',
}

export function nextClickTarget(current: ClickTarget, hasCss: boolean): ClickTarget {
  if (!hasCss) return 'tsx'
  return CLICK_TARGET_TRANSITION[current]
}
