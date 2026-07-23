// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

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

import {
  buildCliCandidates,
  matchIdeLaunchName,
  resolveAutoEditor,
  resolveCliPath,
  resolveOwningEditor,
  toLaunchEditorName,
} from '../../src/vite/editor-cli.js'

const VSCODE_CLI = buildCliCandidates().code.find((path) => path.includes('/') || path.includes('\\'))!
const CURSOR_CLI = buildCliCandidates().cursor.find((path) => path.includes('/') || path.includes('\\'))!

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

describe('matchIdeLaunchName', () => {
  it('prefers cursor over code substring ambiguity', () => {
    expect(matchIdeLaunchName('Cursor')).toBe('cursor')
    expect(matchIdeLaunchName('Cursor Helper')).toBe('cursor')
  })

  it('maps vscode and webstorm process names', () => {
    expect(matchIdeLaunchName('Code Helper')).toBe('code')
    expect(matchIdeLaunchName('webstorm')).toBe('webstorm')
  })

  it('ignores workspace suffix that embeds another IDE name', () => {
    expect(
      matchIdeLaunchName('Code Helper (Plugin): extension-host (user) cursor-app [1-1]'),
    ).toBe('code')
    expect(
      matchIdeLaunchName('Cursor Helper (Plugin): extension-host (user) vscode-repo [1-1]'),
    ).toBe('cursor')
  })

  it('returns null for unrelated processes', () => {
    expect(matchIdeLaunchName('zsh')).toBeNull()
  })
})

describe('resolveOwningEditor', () => {
  const originalLaunchEditor = process.env.LAUNCH_EDITOR
  const originalCursorAgent = process.env.CURSOR_AGENT

  beforeEach(() => {
    mocks.existsSync.mockReset()
    delete process.env.LAUNCH_EDITOR
    delete process.env.CURSOR_AGENT
    delete process.env.CURSOR_EXTENSION_HOST_ROLE
    delete process.env.VSCODE_PID
    delete process.env.VSCODE_NLS_CONFIG
    delete process.env.VSCODE_IPC_HOOK
  })

  afterEach(() => {
    if (originalLaunchEditor === undefined) delete process.env.LAUNCH_EDITOR
    else process.env.LAUNCH_EDITOR = originalLaunchEditor
    if (originalCursorAgent === undefined) delete process.env.CURSOR_AGENT
    else process.env.CURSOR_AGENT = originalCursorAgent
  })

  it('uses LAUNCH_EDITOR when set', () => {
    process.env.LAUNCH_EDITOR = CURSOR_CLI
    mocks.existsSync.mockReturnValue(true)

    expect(resolveOwningEditor()).toBe(CURSOR_CLI)
  })

  it('detects Cursor from CURSOR_AGENT env when ps is unavailable', () => {
    process.env.CURSOR_AGENT = '1'
    mocks.existsSync.mockImplementation((path: string) => path === CURSOR_CLI)

    expect(resolveOwningEditor()).toBe(CURSOR_CLI)
  })
})

describe('resolveAutoEditor terminal editors', () => {
  beforeEach(() => {
    mocks.existsSync.mockReset()
    mocks.guessEditor.mockReset()
  })

  it('ignores vim so the Vite terminal is never hijacked', () => {
    mocks.guessEditor.mockReturnValue(['vim'])

    expect(resolveAutoEditor()).toBeNull()
  })
})
