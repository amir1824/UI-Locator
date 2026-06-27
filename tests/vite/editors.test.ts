// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  launch: vi.fn(),
}))

vi.mock('launch-editor', () => ({
  default: mocks.launch,
}))

import { openInEditor } from '../../src/vite/editors.js'

describe('openInEditor', () => {
  beforeEach(() => {
    mocks.launch.mockReset()
  })

  it('launches cursor with file line and column', () => {
    openInEditor({ file: '/app/src/App.tsx', line: '10', col: '5' }, 'cursor')

    expect(mocks.launch).toHaveBeenCalledWith('/app/src/App.tsx:10:5', 'cursor')
  })

  it('launches vscode when specified', () => {
    openInEditor({ file: '/app/src/App.tsx', line: '3', col: '1' }, 'vscode')

    expect(mocks.launch).toHaveBeenCalledWith('/app/src/App.tsx:3:1', 'vscode')
  })

  it('defaults to cursor for unknown ide', () => {
    openInEditor({ file: '/app/src/App.tsx', line: '1', col: '1' }, 'unknown')

    expect(mocks.launch).toHaveBeenCalledWith('/app/src/App.tsx:1:1', 'cursor')
  })
})
