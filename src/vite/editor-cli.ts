import { existsSync } from 'node:fs'
import guessEditor from 'launch-editor/guess.js'
import type { LocatorIde } from '../shared/index.js'

const IDE_LAUNCH_NAMES: Record<Exclude<LocatorIde, 'auto'>, string> = {
  vscode: 'code',
  cursor: 'cursor',
  webstorm: 'webstorm',
}

function buildCliCandidates(): Record<string, string[]> {
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

export function toLaunchEditorName(ide: Exclude<LocatorIde, 'auto'>): string {
  return IDE_LAUNCH_NAMES[ide]
}

export function resolveCliPath(command: string): string {
  if ((command.includes('/') || command.includes('\\')) && existsSync(command)) {
    return command
  }
  const candidates = CLI_CANDIDATES[command] ?? [command]
  const bundlePath = candidates.find(
    (path) => (path.includes('/') || path.includes('\\')) && existsSync(path),
  )
  if (bundlePath) return bundlePath
  return command
}

export function resolveAutoEditor(): string | null {
  const [editor] = guessEditor()
  if (!editor) return null
  return resolveCliPath(editor)
}
