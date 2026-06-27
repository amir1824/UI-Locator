// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  existsSync: vi.fn(),
  guessEditor: vi.fn(),
}))

vi.mock('node:fs', () => ({
  existsSync: mocks.existsSync,
}))

vi.mock('launch-editor/guess.js', () => ({
  default: mocks.guessEditor,
}))

import { formatLaunchEditorCommand, resolveAutoEditor, resolveCliPath, toLaunchEditorName } from '../../src/vite/editor-cli.js'

const VSCODE_CLI = '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code'

describe('toLaunchEditorName', () => {
  it('maps vscode to code', () => {
    expect(toLaunchEditorName('vscode')).toBe('code')
  })

  it('keeps cursor and webstorm names', () => {
    expect(toLaunchEditorName('cursor')).toBe('cursor')
    expect(toLaunchEditorName('webstorm')).toBe('webstorm')
  })
})

describe('resolveCliPath', () => {
  beforeEach(() => {
    mocks.existsSync.mockReset()
  })

  it('returns existing absolute paths unchanged', () => {
    mocks.existsSync.mockReturnValue(true)
    expect(resolveCliPath(VSCODE_CLI)).toBe(VSCODE_CLI)
  })

  it('resolves code to app bundle path when it exists', () => {
    mocks.existsSync.mockImplementation((path: string) => path === VSCODE_CLI)

    expect(resolveCliPath('code')).toBe(VSCODE_CLI)
  })

  it('falls back to bare command when bundle path is missing', () => {
    mocks.existsSync.mockReturnValue(false)

    expect(resolveCliPath('code')).toBe('code')
  })
})

describe('formatLaunchEditorCommand', () => {
  it('quotes paths that contain spaces', () => {
    expect(formatLaunchEditorCommand(VSCODE_CLI)).toBe(`"${VSCODE_CLI}"`)
  })

  it('leaves bare commands unchanged', () => {
    expect(formatLaunchEditorCommand('code')).toBe('code')
  })
})

describe('resolveAutoEditor', () => {
  beforeEach(() => {
    mocks.existsSync.mockReset()
    mocks.guessEditor.mockReset()
  })

  it('resolves guessed editor to full cli path', () => {
    mocks.guessEditor.mockReturnValue(['code'])
    mocks.existsSync.mockImplementation((path: string) => path === VSCODE_CLI)

    expect(resolveAutoEditor()).toBe(VSCODE_CLI)
  })

  it('returns null when no editor is guessed', () => {
    mocks.guessEditor.mockReturnValue([null])

    expect(resolveAutoEditor()).toBeNull()
  })
})
