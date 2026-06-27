import launch from 'launch-editor'
import { resolveIde } from '../shared/index.js'
import type { LocatorIde, SourceLocation } from '../shared/index.js'
import { resolveAutoEditor, resolveCliPath, toLaunchEditorName } from './editor-cli.js'

export function openInEditor(loc: SourceLocation, ideParam: string, allowed: LocatorIde[]): void {
  const ide = resolveIde(ideParam, allowed)
  const spec = `${loc.file}:${loc.line}:${loc.col}`
  if (ide === 'auto') {
    const resolved = resolveAutoEditor()
    if (resolved) {
      launch(spec, resolved)
      return
    }
    launch(spec)
    return
  }
  const command = resolveCliPath(toLaunchEditorName(ide))
  launch(spec, command)
}
