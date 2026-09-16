import { parseSourceLocation } from '../../shared/index.js'
import { expandedModifierLabel } from '../platform.js'

const DEFAULT_LINE = '1'

function formatSourceLabel(source: string): string {
  const { file, line } = parseSourceLocation(source)
  const name = file.split('/').pop() ?? file
  if (line !== DEFAULT_LINE) return `${name}:${line}`
  return name
}

export function buildTooltipText(
  source: string | undefined,
  userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '',
): string {
  if (!source) return 'No source for this element'
  const expanded = expandedModifierLabel(userAgent)
  return `${formatSourceLabel(source)}\nClick → open · Shift+Click → copy · ${expanded}+Click → expanded`
}
