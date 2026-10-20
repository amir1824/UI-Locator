import { spawn } from 'node:child_process'
import type { ChildProcess, SpawnOptions } from 'node:child_process'
import { win32 } from 'node:path'
import getArgumentsForPosition from 'launch-editor/get-args.js'
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

// win32.basename splits on both `/` and `\`, so a Windows CLI path resolves to its
// command name on every host (launch-editor's own basename is host-separator only).
function commandBasename(cliPath: string): string {
  return win32.basename(cliPath)
}

function commandNameFromCli(cliPath: string): string {
  return commandBasename(cliPath).replace(/\.(exe|cmd|bat)$/i, '').toLowerCase()
}

/** launch-editor already knows each editor's goto-position flags; reuse its map. */
function buildEditorArgs(cliPath: string, location: SourceLocation): string[] {
  return getArgumentsForPosition(commandBasename(cliPath), location.file, location.line, location.col)
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

// Node refuses to `spawn()` a .cmd/.bat directly without `shell: true` (CVE-2024-27980),
// and .cmd is exactly what VS Code/Cursor's Windows CLI shim is. Match launch-editor's own
// fix: build the command line ourselves and run it through cmd.exe, escaping shell
// metacharacters (`escapeCmdArgs`/`doubleQuoteIfNeeded` mirror launch-editor's approach,
// plus `%` → `%%` so env-var expansion can't rewrite the path).
function escapeCmdArgs(value: string): string {
  return value.replace(/%/g, '%%').replace(/([&|<>,;=^])/g, '^$1')
}

function doubleQuoteIfNeeded(value: string): string {
  if (value.includes('^')) return `^"${value}^"`
  if (value.includes(' ')) return `"${value}"`
  return value
}

function spawnWindowsShell(command: string, args: string[], env?: NodeJS.ProcessEnv): ChildProcess {
  const launchCommand = [command, ...args.map(escapeCmdArgs)].map(doubleQuoteIfNeeded).join(' ')
  // spawn + shell avoids exec's 1MB stdout/stderr buffer if the editor logs verbosely.
  return spawn(launchCommand, [], {
    shell: true,
    stdio: 'ignore',
    windowsHide: true,
    ...(env ? { env } : {}),
  })
}

function spawnForPlatform(command: string, args: string[], options: SpawnOptions): ChildProcess {
  if (process.platform === 'win32') return spawnWindowsShell(command, args, options.env)
  return spawn(command, args, options)
}

// Resolve once the OS has actually started the process, so the HTTP endpoint can
// report a missing CLI (ENOENT) instead of answering `ok` before spawn fails.
function awaitSpawn(child: ChildProcess): Promise<void> {
  return new Promise((resolve, reject) => {
    child.on('spawn', () => resolve())
    child.on('error', (error) => {
      warn(`failed to open editor: ${error.message}`)
      reject(error)
    })
  })
}

function spawnEditor(cliPath: string, location: SourceLocation): Promise<void> {
  const url = macEditorUrl(cliPath, location)
  if (url) {
    // `open <url>` talks to the already-running IDE. Spawning MacOS/Cursor or
    // bin/cursor briefly starts a second process (Dock duplicate) before handoff.
    return awaitSpawn(spawnForPlatform('open', [url], { stdio: 'ignore' }))
  }
  return awaitSpawn(
    spawnForPlatform(cliPath, buildEditorArgs(cliPath, location), {
      stdio: 'ignore',
      env: editorEnv(),
    }),
  )
}

export function openInEditor(
  location: SourceLocation,
  ideParam: string,
  allowed: LocatorIde[],
): Promise<void> {
  const ide = resolveIde(ideParam, allowed)
  if (ide !== 'auto') return spawnEditor(resolveCliPath(toLaunchEditorName(ide)), location)

  const resolved = resolveOwningEditor() ?? resolveAutoEditor()
  if (!resolved) {
    const message = 'no editor resolved (set LAUNCH_EDITOR or install a GUI IDE CLI)'
    warn(message)
    return Promise.reject(new Error(message))
  }
  return spawnEditor(resolved, location)
}
