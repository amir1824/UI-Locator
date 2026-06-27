import launch from 'launch-editor'
import { resolveIde } from '../shared/index.js'
import type { LocatorIde, SourceLocation } from '../shared/index.js'

export function openInEditor(loc: SourceLocation, ideParam: string, allowed: LocatorIde[]): void {
  const ide = resolveIde(ideParam, allowed)
  const spec = `${loc.file}:${loc.line}:${loc.col}`
  if (ide === 'auto') {
    launch(spec)
    return
  }
  launch(spec, ide)
}
