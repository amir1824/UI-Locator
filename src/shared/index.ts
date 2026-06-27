export type {
  LocatorTheme,
  LocatorThemeInput,
  LocatorThemeOverride,
  LocatorThemePreset,
} from './theme.js'
export { resolveTheme } from './theme.js'

export type LocatorIde = 'auto' | 'cursor' | 'vscode' | 'webstorm'

export type SourceLocation = {
  file: string
  line: string
  col: string
}

export const SOURCE_ATTR = 'data-source'
export const OPEN_ENDPOINT = '/__open-in-editor'
export const DEFAULT_IDE: LocatorIde = 'auto'
export const IDE_ORDER: LocatorIde[] = ['auto', 'cursor', 'vscode', 'webstorm']

export function isLocatorIde(value: string): value is LocatorIde {
  return IDE_ORDER.includes(value as LocatorIde)
}

export function resolveIde(value: string, allowed: LocatorIde[]): LocatorIde {
  const fallback = allowed[0] ?? DEFAULT_IDE
  if (!isLocatorIde(value)) return fallback
  if (!allowed.includes(value)) return fallback
  return value
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
