// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  launch: vi.fn(),
}))

vi.mock('launch-editor', () => ({
  default: mocks.launch,
}))

import { IDE_ORDER } from '../../src/shared/index.js'
import { openInEditor } from '../../src/vite/editors.js'

describe('openInEditor', () => {
  beforeEach(() => {
    mocks.launch.mockReset()
  })

  it('auto-detects editor when ide is auto', () => {
    openInEditor({ file: '/app/src/App.tsx', line: '10', col: '5' }, 'auto', IDE_ORDER)

    expect(mocks.launch).toHaveBeenCalledWith('/app/src/App.tsx:10:5')
  })

  it('launches cursor with file line and column', () => {
    openInEditor({ file: '/app/src/App.tsx', line: '10', col: '5' }, 'cursor', IDE_ORDER)

    expect(mocks.launch).toHaveBeenCalledWith('/app/src/App.tsx:10:5', 'cursor')
  })

  it('launches vscode when specified', () => {
    openInEditor({ file: '/app/src/App.tsx', line: '3', col: '1' }, 'vscode', ['vscode'])

    expect(mocks.launch).toHaveBeenCalledWith('/app/src/App.tsx:3:1', 'vscode')
  })

  it('falls back to allowed list for unknown ide', () => {
    openInEditor({ file: '/app/src/App.tsx', line: '1', col: '1' }, 'unknown', ['vscode'])

    expect(mocks.launch).toHaveBeenCalledWith('/app/src/App.tsx:1:1', 'vscode')
  })
})
