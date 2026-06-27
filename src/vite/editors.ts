import launch from 'launch-editor'
import { DEFAULT_IDE, isLocatorIde } from '../shared/index.js'
import type { SourceLocation } from '../shared/index.js'

export function openInEditor(loc: SourceLocation, ideParam: string): void {
  const ide = isLocatorIde(ideParam) ? ideParam : DEFAULT_IDE
  const spec = `${loc.file}:${loc.line}:${loc.col}`
  launch(spec, ide)
}
