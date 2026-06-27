import { parseSourceLocation } from '../shared/index.js'

const DEFAULT_LINE = '1'

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
): string {
  const lines: string[] = []
  if (tsxSource) lines.push(formatSourceLabel(tsxSource, 'TSX'))
  if (cssSource) lines.push(formatSourceLabel(cssSource, 'CSS'))

  if (!cssSource) {
    lines.push('Click → open TSX')
    return lines.join('\n')
  }
  lines.push('Click → open TSX', 'Shift+C → CSS')
  return lines.join('\n')
}
