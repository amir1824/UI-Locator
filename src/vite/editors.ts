import { spawn } from 'node:child_process'
import { basename } from 'node:path'
import { resolveIde } from '../shared/index.js'
import type { LocatorIde, SourceLocation } from '../shared/index.js'
import {
  resolveAutoEditor,
  resolveCliPath,
  resolveOwningEditor,
  toLaunchEditorName,
} from './editor-cli.js'

function commandNameFromCli(cliPath: string): string {
  return basename(cliPath).replace(/\.(exe|cmd|bat)$/i, '').toLowerCase()
}

function buildEditorArgs(cliPath: string, location: SourceLocation): string[] {
  const commandName = commandNameFromCli(cliPath)
  if (commandName === 'webstorm' || commandName === 'webstorm64') {
    return ['--line', location.line, '--column', location.col, location.file]
  }
  return ['-r', '-g', `${location.file}:${location.line}:${location.col}`]
}

/** vscode:// / cursor:// open the running app via Launch Services — no second Dock icon. */
function macEditorUrl(cliPath: string, location: SourceLocation): string | null {
  if (process.platform !== 'darwin') return null
  const commandName = commandNameFromCli(cliPath)
  const scheme = commandName === 'cursor' ? 'cursor' : commandName === 'code' ? 'vscode' : null
  if (!scheme) return null
  const filePath = location.file.split('/').map(encodeURIComponent).join('/')
  return `${scheme}://file${filePath}:${location.line}:${location.col}`
}

function editorEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    HOME: process.env.HOME,
    USER: process.env.USER,
    TMPDIR: process.env.TMPDIR,
    PATH: process.env.PATH,
    LANG: process.env.LANG,
  }
  if (process.env.VSCODE_IPC_HOOK_CLI) {
    env.VSCODE_IPC_HOOK_CLI = process.env.VSCODE_IPC_HOOK_CLI
  }
  return env
}

function spawnEditor(cliPath: string, location: SourceLocation): void {
  const url = macEditorUrl(cliPath, location)
  if (url) {
    // `open <url>` talks to the already-running IDE. Spawning MacOS/Cursor or
    // bin/cursor briefly starts a second process (Dock duplicate) before handoff.
    spawn('open', [url], { stdio: 'ignore' })
    return
  }
  spawn(cliPath, buildEditorArgs(cliPath, location), {
    stdio: 'ignore',
    env: editorEnv(),
  })
}

export function openInEditor(
  location: SourceLocation,
  ideParam: string,
  allowed: LocatorIde[],
): void {
  const ide = resolveIde(ideParam, allowed)
  if (ide === 'auto') {
    const resolved = resolveOwningEditor() ?? resolveAutoEditor()
    if (!resolved) return
    spawnEditor(resolved, location)
    return
  }
  spawnEditor(resolveCliPath(toLaunchEditorName(ide)), location)
}
