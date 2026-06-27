// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  existsSync: vi.fn(),
  execFileSync: vi.fn(),
}))

vi.mock('node:fs', () => ({
  existsSync: mocks.existsSync,
}))

vi.mock('node:child_process', () => ({
  execFileSync: mocks.execFileSync,
}))

import { openInEditor } from '../../src/vite/editors.js'

describe('openInEditor', () => {
  beforeEach(() => {
    mocks.existsSync.mockReset()
    mocks.execFileSync.mockReset()
    mocks.execFileSync.mockReturnValue(Buffer.from(''))
  })

  it('uses cli when app bundle exists', () => {
    mocks.existsSync.mockReturnValue(true)

    openInEditor({ file: '/app/src/App.tsx', line: '10', col: '5' }, 'cursor')

    expect(mocks.execFileSync).toHaveBeenCalledWith(
      '/Applications/Cursor.app/Contents/Resources/app/bin/cursor',
      ['-r', '-g', '/app/src/App.tsx:10:5'],
      { stdio: 'ignore' },
    )
  })

  it('falls back to url scheme when cli is unavailable', () => {
    mocks.execFileSync.mockImplementation((cmd: string) => {
      if (cmd === 'which') throw new Error('not found')
      return Buffer.from('')
    })

    openInEditor({ file: '/app/src/App.tsx', line: '3', col: '1' }, 'vscode')

    expect(mocks.execFileSync).toHaveBeenCalledWith(
      'open',
      ['vscode://file//app/src/App.tsx:3:1'],
      { stdio: 'ignore' },
    )
  })

  it('defaults to cursor for unknown ide', () => {
    mocks.existsSync.mockReturnValue(true)

    openInEditor({ file: '/app/src/App.tsx', line: '1', col: '1' }, 'unknown')

    expect(mocks.execFileSync).toHaveBeenCalledWith(
      '/Applications/Cursor.app/Contents/Resources/app/bin/cursor',
      ['-r', '-g', '/app/src/App.tsx:1:1'],
      { stdio: 'ignore' },
    )
  })
})
