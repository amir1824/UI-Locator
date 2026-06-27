import { parseSourceLocation } from '../shared/index.js'

const DEFAULT_LINE = '1'

function formatSourceLabel(source: string): string {
  const { file, line } = parseSourceLocation(source)
  const name = file.split('/').pop() ?? file
  if (line !== DEFAULT_LINE) return `${name}:${line}`
  return name
}

export function buildTooltipText(source: string | undefined): string {
  if (!source) return 'No source for this element'
  return `${formatSourceLabel(source)}\nClick → open`
}
