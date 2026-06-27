import { parseSourceLocation } from '../shared/index.js'
import type { ClickTarget } from '../shared/index.js'

const DEFAULT_LINE = '1'

const CLICK_PROMPT_ORDER: Record<ClickTarget, readonly [string, string]> = {
  tsx: ['TSX', 'CSS'],
  css: ['CSS', 'TSX'],
}

function formatSourceLabel(source: string, prefix?: string): string {
  const { file, line } = parseSourceLocation(source)
  const name = file.split('/').pop() ?? file
  const label = line !== DEFAULT_LINE ? `${name}:${line}` : name
  if (prefix) return `${prefix}: ${label}`
  return label
}

export function buildTooltipText(
  tsxSource: string | undefined,
  cssSource: string | undefined,
  clickTarget: ClickTarget,
): string {
  const lines: string[] = []
  if (tsxSource) lines.push(formatSourceLabel(tsxSource, 'TSX'))
  if (cssSource) lines.push(formatSourceLabel(cssSource, 'CSS'))

  if (!cssSource) {
    lines.push('Click → open TSX')
    return lines.join('\n')
  }
  const [first, second] = CLICK_PROMPT_ORDER[clickTarget]
  lines.push(`Click → open ${first}`, `Click again → open ${second}`)
  return lines.join('\n')
}
