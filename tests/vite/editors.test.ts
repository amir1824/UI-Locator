// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  launch: vi.fn(),
  resolveAutoEditor: vi.fn(),
  resolveCliPath: vi.fn((command: string) => command),
  toLaunchEditorName: vi.fn((ide: string) => (ide === 'vscode' ? 'code' : ide)),
}))

vi.mock('launch-editor', () => ({
  default: mocks.launch,
}))

vi.mock('../../src/vite/editor-cli.js', () => ({
  resolveAutoEditor: mocks.resolveAutoEditor,
  resolveCliPath: mocks.resolveCliPath,
  toLaunchEditorName: mocks.toLaunchEditorName,
}))

import { IDE_ORDER } from '../../src/shared/index.js'
import { openInEditor } from '../../src/vite/editors.js'

const VSCODE_CLI = '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code'

describe('openInEditor', () => {
  beforeEach(() => {
    mocks.launch.mockReset()
    mocks.resolveAutoEditor.mockReset()
    mocks.resolveCliPath.mockImplementation((command: string) => command)
    mocks.toLaunchEditorName.mockImplementation((ide: string) => (ide === 'vscode' ? 'code' : ide))
  })

  it('launches resolved editor when ide is auto', () => {
    mocks.resolveAutoEditor.mockReturnValue(VSCODE_CLI)

    openInEditor({ file: '/app/src/App.tsx', line: '10', col: '5' }, 'auto', IDE_ORDER)

    expect(mocks.resolveAutoEditor).toHaveBeenCalledOnce()
    expect(mocks.launch).toHaveBeenCalledWith('/app/src/App.tsx:10:5', VSCODE_CLI)
  })

  it('falls back to bare auto launch when no editor is resolved', () => {
    mocks.resolveAutoEditor.mockReturnValue(null)

    openInEditor({ file: '/app/src/App.tsx', line: '10', col: '5' }, 'auto', IDE_ORDER)

    expect(mocks.launch).toHaveBeenCalledWith('/app/src/App.tsx:10:5')
  })

  it('launches cursor with resolved cli path', () => {
    mocks.resolveCliPath.mockReturnValue('/Applications/Cursor.app/Contents/Resources/app/bin/cursor')

    openInEditor({ file: '/app/src/App.tsx', line: '10', col: '5' }, 'cursor', IDE_ORDER)

    expect(mocks.toLaunchEditorName).toHaveBeenCalledWith('cursor')
    expect(mocks.launch).toHaveBeenCalledWith(
      '/app/src/App.tsx:10:5',
      '/Applications/Cursor.app/Contents/Resources/app/bin/cursor',
    )
  })

  it('maps vscode to code before launching', () => {
    mocks.resolveCliPath.mockReturnValue(VSCODE_CLI)

    openInEditor({ file: '/app/src/App.tsx', line: '3', col: '1' }, 'vscode', ['vscode'])

    expect(mocks.toLaunchEditorName).toHaveBeenCalledWith('vscode')
    expect(mocks.resolveCliPath).toHaveBeenCalledWith('code')
    expect(mocks.launch).toHaveBeenCalledWith('/app/src/App.tsx:3:1', VSCODE_CLI)
  })

  it('falls back to allowed list for unknown ide', () => {
    mocks.resolveCliPath.mockReturnValue(VSCODE_CLI)

    openInEditor({ file: '/app/src/App.tsx', line: '1', col: '1' }, 'unknown', ['vscode'])

    expect(mocks.toLaunchEditorName).toHaveBeenCalledWith('vscode')
    expect(mocks.launch).toHaveBeenCalledWith('/app/src/App.tsx:1:1', VSCODE_CLI)
  })
})
