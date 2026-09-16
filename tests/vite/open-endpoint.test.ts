// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { join } from 'node:path'

const mocks = vi.hoisted(() => ({
  existsSync: vi.fn(),
  realpathSync: vi.fn(),
}))

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    existsSync: mocks.existsSync,
    realpathSync: mocks.realpathSync,
  }
})

import { isInsideRoot } from '../../src/vite/open-endpoint.js'

describe('isInsideRoot', () => {
  beforeEach(() => {
    mocks.existsSync.mockReset()
    mocks.realpathSync.mockReset()
  })

  it('denies when the path exists but realpathSync throws', () => {
    const root = '/project'
    const resolved = join(root, 'src', 'File.tsx')
    mocks.realpathSync.mockImplementation(() => {
      throw new Error('EACCES')
    })
    mocks.existsSync.mockReturnValue(true)

    expect(isInsideRoot(resolved, root)).toBe(false)
  })

  it('allows nonexistent paths through for the caller to 404', () => {
    const root = '/project'
    const resolved = join(root, 'src', 'Missing.tsx')
    mocks.realpathSync.mockImplementation(() => {
      throw new Error('ENOENT')
    })
    mocks.existsSync.mockReturnValue(false)

    expect(isInsideRoot(resolved, root)).toBe(true)
  })
})
