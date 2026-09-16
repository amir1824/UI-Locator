import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { basename } from 'node:path'
import guessEditor from 'launch-editor/guess.js'
import type { LocatorIde } from '../shared/index.js'

const IDE_LAUNCH_NAMES: Record<Exclude<LocatorIde, 'auto'>, string> = {
  vscode: 'code',
  cursor: 'cursor',
  webstorm: 'webstorm',
}

const MAX_PARENT_WALK = 32

const TERMINAL_EDITORS = new Set(['vi', 'vim', 'nvim', 'emacs', 'nano', 'ed'])

export function buildCliCandidates(): Record<string, string[]> {
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA ?? ''
    const programFiles = process.env.ProgramFiles ?? 'C:\\Program Files'
    return {
      code: [
        `${localAppData}\\Programs\\Microsoft VS Code\\bin\\code.cmd`,
        `${programFiles}\\Microsoft VS Code\\bin\\code.cmd`,
        'code',
      ],
      cursor: [`${localAppData}\\Programs\\cursor\\Cursor.exe`, 'cursor'],
      webstorm: [`${programFiles}\\JetBrains\\WebStorm\\bin\\webstorm64.exe`, 'webstorm'],
    }
  }
  return {
    code: ['/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code', 'code'],
    cursor: ['/Applications/Cursor.app/Contents/Resources/app/bin/cursor', 'cursor'],
    webstorm: ['/Applications/WebStorm.app/Contents/MacOS/webstorm', 'webstorm'],
  }
}

const CLI_CANDIDATES = buildCliCandidates()

const isPathLike = (value: string): boolean => value.includes('/') || value.includes('\\')

export function toLaunchEditorName(ide: Exclude<LocatorIde, 'auto'>): string {
  return IDE_LAUNCH_NAMES[ide]
}

export function resolveCliPath(command: string): string {
  if (isPathLike(command) && existsSync(command)) {
    return command
  }
  const candidates = CLI_CANDIDATES[command] ?? [command]
  const bundlePath = candidates.find((path) => isPathLike(path) && existsSync(path))
  if (bundlePath) return bundlePath
  return command
}

/** Map a process command name to a launch-editor CLI. Cursor before Code. */
export function matchIdeLaunchName(processName: string): string | null {
  // macOS titles embed the workspace after `:`; match identity only.
  const identity = processName.split(':', 1)[0].toLowerCase()
  if (/(?:^|\/)cursor(?:\.app|\s|$)/.test(identity)) return 'cursor'
  if (/(?:^|\/)webstorm(?:\.app|\s|$)/.test(identity)) return 'webstorm'
  if (/(?:^|\/)code(?:\s|$)/.test(identity) || identity.includes('visual studio code.app')) {
    return 'code'
  }
  return null
}

function readUnixProcess(pid: number): { ppid: number; comm: string } | null {
  try {
    const out = execFileSync('ps', ['-o', 'ppid=,comm=', '-p', String(pid)], {
      encoding: 'utf8',
    }).trim()
    const match = out.match(/^(\d+)\s+(.+)$/)
    if (!match) return null
    return { ppid: Number(match[1]), comm: match[2] }
  } catch {
    return null
  }
}

function walkParentsForEditor(): string | null {
  // ponytail: Windows parent walk is brittle; fall back to machine-wide guess instead.
  if (process.platform === 'win32') return null

  let pid = process.pid
  const seen = new Set<number>()
  for (let i = 0; i < MAX_PARENT_WALK; i++) {
    if (pid <= 0 || seen.has(pid)) break
    seen.add(pid)
    const info = readUnixProcess(pid)
    if (!info) break
    const launchName = matchIdeLaunchName(info.comm)
    if (launchName) return resolveCliPath(launchName)
    pid = info.ppid
  }
  return null
}

// The dev server's parent process never changes during its lifetime, but each call
// shells out to `ps` up to MAX_PARENT_WALK times — costly to redo on every click.
let parentWalkResult: string | null | undefined
function resolveEditorFromParentWalk(): string | null {
  if (parentWalkResult === undefined) parentWalkResult = walkParentsForEditor()
  return parentWalkResult
}

/** IDE-injected env when Vite was started from an integrated terminal / agent. */
export function resolveEditorFromEnv(): string | null {
  if (process.env.CURSOR_AGENT || process.env.CURSOR_EXTENSION_HOST_ROLE) {
    return resolveCliPath('cursor')
  }
  const hints = [
    process.env.VSCODE_NLS_CONFIG,
    process.env.VSCODE_IPC_HOOK,
    process.env.VSCODE_PROCESS_TITLE,
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase()
  if (hints.includes('cursor')) return resolveCliPath('cursor')
  // Do not treat VSCODE_PID alone as VS Code — Cursor and other forks set it too,
  // and a false `code` hit would skip the parent-process walk.
  if (hints.includes('visual studio code')) return resolveCliPath('code')
  return null
}

export function resolveOwningEditor(): string | null {
  const fromEnv = process.env.LAUNCH_EDITOR?.trim()
  if (fromEnv) return resolveCliPath(fromEnv)
  return resolveEditorFromEnv() ?? resolveEditorFromParentWalk()
}

export function resolveAutoEditor(): string | null {
  const [editor] = guessEditor()
  if (!editor) return null
  if (TERMINAL_EDITORS.has(basename(editor))) return null
  return resolveCliPath(editor)
}
