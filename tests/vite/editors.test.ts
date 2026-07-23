// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  spawn: vi.fn(() => ({ unref: vi.fn() })),
  resolveOwningEditor: vi.fn(),
  resolveAutoEditor: vi.fn(),
  resolveCliPath: vi.fn((command: string) => command),
  toLaunchEditorName: vi.fn((ide: string) => (ide === 'vscode' ? 'code' : ide)),
}))

vi.mock('node:child_process', () => ({
  spawn: mocks.spawn,
}))

vi.mock('../../src/vite/editor-cli.js', () => ({
  resolveOwningEditor: mocks.resolveOwningEditor,
  resolveAutoEditor: mocks.resolveAutoEditor,
  resolveCliPath: mocks.resolveCliPath,
  toLaunchEditorName: mocks.toLaunchEditorName,
}))

import { IDE_ORDER } from '../../src/shared/index.js'
import { openInEditor } from '../../src/vite/editors.js'

const VSCODE_CLI = '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code'
const CURSOR_CLI = '/Applications/Cursor.app/Contents/Resources/app/bin/cursor'

describe('openInEditor', () => {
  const originalPlatform = process.platform

  beforeEach(() => {
    mocks.spawn.mockClear()
    mocks.spawn.mockReturnValue({ unref: vi.fn() })
    mocks.resolveOwningEditor.mockReset()
    mocks.resolveAutoEditor.mockReset()
    mocks.resolveCliPath.mockImplementation((command: string) => command)
    mocks.toLaunchEditorName.mockImplementation((ide: string) => (ide === 'vscode' ? 'code' : ide))
    Object.defineProperty(process, 'platform', { value: 'linux', configurable: true })
  })

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
  })

  it('opens owning Cursor via CLI -r -g without detached', () => {
    mocks.resolveOwningEditor.mockReturnValue(CURSOR_CLI)

    openInEditor({ file: '/app/src/App.tsx', line: '10', col: '5' }, 'auto', IDE_ORDER)

    expect(mocks.spawn).toHaveBeenCalledWith(
      CURSOR_CLI,
      ['-r', '-g', '/app/src/App.tsx:10:5'],
      { stdio: 'ignore', env: expect.any(Object) },
    )
    expect(mocks.spawn.mock.calls[0][2]).not.toHaveProperty('detached')
  })

  it('opens resolved editor when ide is auto', () => {
    mocks.resolveOwningEditor.mockReturnValue(null)
    mocks.resolveAutoEditor.mockReturnValue(VSCODE_CLI)

    openInEditor({ file: '/app/src/App.tsx', line: '10', col: '5' }, 'auto', IDE_ORDER)

    expect(mocks.spawn).toHaveBeenCalledWith(
      VSCODE_CLI,
      ['-r', '-g', '/app/src/App.tsx:10:5'],
      { stdio: 'ignore', env: expect.any(Object) },
    )
  })

  it('does nothing when no editor is resolved', () => {
    mocks.resolveOwningEditor.mockReturnValue(null)
    mocks.resolveAutoEditor.mockReturnValue(null)

    openInEditor({ file: '/app/src/App.tsx', line: '10', col: '5' }, 'auto', IDE_ORDER)

    expect(mocks.spawn).not.toHaveBeenCalled()
  })

  it('spawns cursor with reuse and goto flags', () => {
    mocks.resolveCliPath.mockReturnValue(CURSOR_CLI)

    openInEditor({ file: '/app/src/App.tsx', line: '10', col: '5' }, 'cursor', IDE_ORDER)

    expect(mocks.toLaunchEditorName).toHaveBeenCalledWith('cursor')
    expect(mocks.spawn).toHaveBeenCalledWith(
      CURSOR_CLI,
      ['-r', '-g', '/app/src/App.tsx:10:5'],
      { stdio: 'ignore', env: expect.any(Object) },
    )
  })

  it('maps vscode to code before spawning', () => {
    mocks.resolveCliPath.mockReturnValue(VSCODE_CLI)

    openInEditor({ file: '/app/src/App.tsx', line: '3', col: '1' }, 'vscode', ['vscode'])

    expect(mocks.resolveCliPath).toHaveBeenCalledWith('code')
    expect(mocks.spawn).toHaveBeenCalledWith(
      VSCODE_CLI,
      ['-r', '-g', '/app/src/App.tsx:3:1'],
      { stdio: 'ignore', env: expect.any(Object) },
    )
  })

  it('spawns webstorm with line and column flags', () => {
    mocks.resolveCliPath.mockReturnValue('webstorm')
    mocks.toLaunchEditorName.mockReturnValue('webstorm')

    openInEditor({ file: '/app/src/App.tsx', line: '4', col: '2' }, 'webstorm', IDE_ORDER)

    expect(mocks.spawn).toHaveBeenCalledWith(
      'webstorm',
      ['--line', '4', '--column', '2', '/app/src/App.tsx'],
      { stdio: 'ignore', env: expect.any(Object) },
    )
  })

  it('on macOS opens Cursor via URL scheme (no second process)', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true })
    mocks.resolveOwningEditor.mockReturnValue(CURSOR_CLI)

    openInEditor({ file: '/app/src/App.tsx', line: '10', col: '5' }, 'auto', IDE_ORDER)

    expect(mocks.spawn).toHaveBeenCalledWith(
      'open',
      ['cursor://file/app/src/App.tsx:10:5'],
      { stdio: 'ignore' },
    )
  })

  it('on macOS opens VS Code via vscode URL scheme', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true })
    mocks.resolveCliPath.mockReturnValue(VSCODE_CLI)

    openInEditor({ file: '/Users/me/My App/src/App.tsx', line: '3', col: '1' }, 'vscode', [
      'vscode',
    ])

    expect(mocks.spawn).toHaveBeenCalledWith(
      'open',
      ['vscode://file/Users/me/My%20App/src/App.tsx:3:1'],
      { stdio: 'ignore' },
    )
  })

  it('on macOS still spawns webstorm CLI', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true })
    mocks.resolveCliPath.mockReturnValue('webstorm')
    mocks.toLaunchEditorName.mockReturnValue('webstorm')

    openInEditor({ file: '/app/src/App.tsx', line: '4', col: '2' }, 'webstorm', IDE_ORDER)

    expect(mocks.spawn).toHaveBeenCalledWith(
      'webstorm',
      ['--line', '4', '--column', '2', '/app/src/App.tsx'],
      { stdio: 'ignore', env: expect.any(Object) },
    )
  })
})
