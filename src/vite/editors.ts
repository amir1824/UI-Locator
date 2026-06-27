import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { DEFAULT_IDE, isLocatorIde } from '../shared/index.js'
import type { LocatorIde, SourceLocation } from '../shared/index.js'

type EditorDefinition = {
  id: LocatorIde
  cliCandidates: string[]
  openWithCli: (cli: string, loc: SourceLocation) => void
  openWithUrl: (loc: SourceLocation) => void
}

type VscodeForkId = Extract<LocatorIde, 'cursor' | 'vscode'>

function createVscodeForkEditor(id: VscodeForkId, cliCandidates: string[]): EditorDefinition {
  return {
    id,
    cliCandidates,
    openWithCli(cli, loc) {
      execFileSync(cli, ['-r', '-g', `${loc.file}:${loc.line}:${loc.col}`], { stdio: 'ignore' })
    },
    openWithUrl(loc) {
      execFileSync('open', [`${id}://file/${loc.file}:${loc.line}:${loc.col}`], { stdio: 'ignore' })
    },
  }
}

const EDITORS: EditorDefinition[] = [
  createVscodeForkEditor('cursor', [
    '/Applications/Cursor.app/Contents/Resources/app/bin/cursor',
    'cursor',
  ]),
  createVscodeForkEditor('vscode', [
    '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code',
    'code',
  ]),
  {
    id: 'webstorm',
    cliCandidates: ['/Applications/WebStorm.app/Contents/MacOS/webstorm', 'webstorm'],
    openWithCli(cli, loc) {
      execFileSync(cli, ['--line', loc.line, loc.file], { stdio: 'ignore' })
    },
    openWithUrl(loc) {
      const uri = `webstorm://open?file=${encodeURIComponent(loc.file)}&line=${loc.line}`
      execFileSync('open', [uri], { stdio: 'ignore' })
    },
  },
]

function canRun(command: string): boolean {
  try {
    execFileSync('which', [command], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function resolveCli(candidates: string[]): string | null {
  const appPath = candidates.find((path) => path.includes('/') && existsSync(path))
  if (appPath) return appPath
  return candidates.filter((path) => !path.includes('/')).find((path) => canRun(path)) ?? null
}

function findEditor(ide: LocatorIde): EditorDefinition {
  return EDITORS.find((entry) => entry.id === ide) ?? EDITORS[0]!
}

export function openInEditor(loc: SourceLocation, ideParam: string): void {
  const ide = isLocatorIde(ideParam) ? ideParam : DEFAULT_IDE
  const editor = findEditor(ide)
  const cli = resolveCli(editor.cliCandidates)

  if (cli) {
    editor.openWithCli(cli, loc)
    return
  }

  editor.openWithUrl(loc)
}
