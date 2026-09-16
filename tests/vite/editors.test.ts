// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  spawn: vi.fn<
    (command: string, args?: string[], options?: Record<string, unknown>) => {
      on: ReturnType<typeof vi.fn>
      unref: ReturnType<typeof vi.fn>
    }
  >(),
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
    mocks.spawn.mockReturnValue({ on: vi.fn(), unref: vi.fn() })
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
    expect(mocks.spawn.mock.results[0].value.on).toHaveBeenCalledWith('error', expect.any(Function))
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

  it('warns and skips spawn when no editor is resolved', () => {
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    mocks.resolveOwningEditor.mockReturnValue(null)
    mocks.resolveAutoEditor.mockReturnValue(null)

    openInEditor({ file: '/app/src/App.tsx', line: '10', col: '5' }, 'auto', IDE_ORDER)

    expect(mocks.spawn).not.toHaveBeenCalled()
    expect(write).toHaveBeenCalledWith(expect.stringContaining('no editor resolved'))
    write.mockRestore()
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

  it('scrubs ELECTRON_RUN_AS_NODE from spawn env but keeps DISPLAY', () => {
    process.env.ELECTRON_RUN_AS_NODE = '1'
    process.env.DISPLAY = ':0'
    mocks.resolveOwningEditor.mockReturnValue(CURSOR_CLI)

    openInEditor({ file: '/app/src/App.tsx', line: '10', col: '5' }, 'auto', IDE_ORDER)

    const options = mocks.spawn.mock.calls[0][2] as { env: NodeJS.ProcessEnv }
    expect(options.env.ELECTRON_RUN_AS_NODE).toBeUndefined()
    expect(options.env.DISPLAY).toBe(':0')

    delete process.env.ELECTRON_RUN_AS_NODE
    delete process.env.DISPLAY
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

  describe('on Windows', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true })
    })

    it('runs a .cmd CLI through shell:true spawn (avoids Node EINVAL + exec buffers)', () => {
      mocks.resolveOwningEditor.mockReturnValue('C:\\code.cmd')

      openInEditor({ file: 'C:\\app\\src\\App.tsx', line: '10', col: '5' }, 'auto', IDE_ORDER)

      expect(mocks.spawn).toHaveBeenCalledWith(
        'C:\\code.cmd -r -g C:\\app\\src\\App.tsx:10:5',
        [],
        expect.objectContaining({ shell: true, stdio: 'ignore', windowsHide: true }),
      )
    })

    it('escapes shell metacharacters in the file path', () => {
      mocks.resolveOwningEditor.mockReturnValue('C:\\code.cmd')

      openInEditor({ file: 'C:\\app\\A & B\\App.tsx', line: '1', col: '1' }, 'auto', IDE_ORDER)

      const [command] = mocks.spawn.mock.calls[0]
      expect(command).toBe('C:\\code.cmd -r -g ^"C:\\app\\A ^& B\\App.tsx:1:1^"')
    })

    it('escapes % so cmd env-var expansion cannot rewrite the path', () => {
      mocks.resolveOwningEditor.mockReturnValue('C:\\code.cmd')

      openInEditor({ file: 'C:\\app\\%TEMP%\\App.tsx', line: '1', col: '1' }, 'auto', IDE_ORDER)

      const [command] = mocks.spawn.mock.calls[0]
      expect(command).toBe('C:\\code.cmd -r -g C:\\app\\%%TEMP%%\\App.tsx:1:1')
    })

    it('reports spawn failures without throwing', () => {
      mocks.resolveOwningEditor.mockReturnValue('C:\\code.cmd')
      mocks.spawn.mockReturnValue({
        on: vi.fn((event: string, handler: (error: Error) => void) => {
          if (event === 'error') handler(new Error('boom'))
        }),
        unref: vi.fn(),
      })
      const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

      openInEditor({ file: 'C:\\app\\src\\App.tsx', line: '1', col: '1' }, 'auto', IDE_ORDER)

      expect(stderr).toHaveBeenCalledWith(expect.stringContaining('boom'))
      stderr.mockRestore()
    })
  })
})
