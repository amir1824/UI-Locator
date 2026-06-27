import launch from 'launch-editor'
import { formatSourceLocation, resolveIde } from '../shared/index.js'
import type { LocatorIde, SourceLocation } from '../shared/index.js'
import { formatLaunchEditorCommand, resolveAutoEditor, resolveCliPath, toLaunchEditorName } from './editor-cli.js'

export function openInEditor(loc: SourceLocation, ideParam: string, allowed: LocatorIde[]): void {
  const ide = resolveIde(ideParam, allowed)
  const spec = formatSourceLocation(loc)
  if (ide === 'auto') {
    const resolved = resolveAutoEditor()
    if (resolved) {
      launch(spec, formatLaunchEditorCommand(resolved))
      return
    }
    launch(spec)
    return
  }
  const command = resolveCliPath(toLaunchEditorName(ide))
  launch(spec, formatLaunchEditorCommand(command))
}
