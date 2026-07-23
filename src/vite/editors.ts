import { spawn } from 'node:child_process'
import type { SpawnOptions } from 'node:child_process'
import { basename } from 'node:path'
import { resolveIde } from '../shared/index.js'
import type { LocatorIde, SourceLocation } from '../shared/index.js'
import {
  resolveAutoEditor,
  resolveCliPath,
  resolveOwningEditor,
  toLaunchEditorName,
} from './editor-cli.js'

const MAC_URL_SCHEMES: Record<string, string> = {
  cursor: 'cursor',
  code: 'vscode',
}

const POISON_ENV_KEYS = ['ELECTRON_RUN_AS_NODE', 'NODE_OPTIONS'] as const

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
  const scheme = MAC_URL_SCHEMES[commandNameFromCli(cliPath)]
  if (!scheme) return null
  const filePath = location.file.split('/').map(encodeURIComponent).join('/')
  return `${scheme}://file${filePath}:${location.line}:${location.col}`
}

function editorEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env }
  for (const key of POISON_ENV_KEYS) delete env[key]
  return env
}

function warn(message: string): void {
  process.stderr.write(`[source-locator] ${message}\n`)
}

function runSpawn(command: string, args: string[], options: SpawnOptions): void {
  spawn(command, args, options).on('error', (error) => {
    warn(`failed to open editor: ${error.message}`)
  })
}

function spawnEditor(cliPath: string, location: SourceLocation): void {
  const url = macEditorUrl(cliPath, location)
  if (url) {
    // `open <url>` talks to the already-running IDE. Spawning MacOS/Cursor or
    // bin/cursor briefly starts a second process (Dock duplicate) before handoff.
    runSpawn('open', [url], { stdio: 'ignore' })
    return
  }
  runSpawn(cliPath, buildEditorArgs(cliPath, location), {
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
    if (!resolved) {
      warn('no editor resolved (set LAUNCH_EDITOR or install a GUI IDE CLI)')
      return
    }
    spawnEditor(resolved, location)
    return
  }
  spawnEditor(resolveCliPath(toLaunchEditorName(ide)), location)
}
