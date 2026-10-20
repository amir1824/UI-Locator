// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { join, resolve } from 'node:path'

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

import { isInsideAnyRoot, isInsideRoot, resolveFilePath } from '../../src/vite/open-endpoint.js'

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

describe('isInsideAnyRoot', () => {
  beforeEach(() => {
    mocks.existsSync.mockReset()
    mocks.realpathSync.mockReset()
    mocks.realpathSync.mockImplementation((path: string) => path)
  })

  it('allows a file under any of the allowed roots', () => {
    const roots = ['/mono/apps/web', '/mono/packages/ui']

    expect(isInsideAnyRoot('/mono/packages/ui/Button.tsx', roots)).toBe(true)
  })

  it('denies a file outside every allowed root', () => {
    const roots = ['/mono/apps/web', '/mono/packages/ui']

    expect(isInsideAnyRoot('/mono/packages/secrets/.env', roots)).toBe(false)
  })
})

describe('resolveFilePath', () => {
  beforeEach(() => {
    mocks.existsSync.mockReset()
    mocks.realpathSync.mockReset()
    mocks.realpathSync.mockImplementation((path: string) => path)
  })

  it('keeps an existing absolute path that starts with /src (container WORKDIR)', () => {
    mocks.existsSync.mockReturnValue(true)

    expect(resolveFilePath('/src/components/App.tsx', '/src', ['/src'])).toBe(
      resolve('/src/components/App.tsx'),
    )
  })

  it('retries a Vite dev URL root-relative when it is not on disk', () => {
    mocks.existsSync.mockReturnValue(false)

    expect(resolveFilePath('/src/App.tsx', '/project', ['/project'])).toBe(
      resolve('/project', 'src', 'App.tsx'),
    )
  })

  it('never keeps an existing absolute path outside the allowed roots (no existence oracle)', () => {
    mocks.existsSync.mockReturnValue(true)

    expect(resolveFilePath('/etc/passwd', '/project', ['/project'])).toBe(
      resolve('/project', 'etc', 'passwd'),
    )
  })

  it('resolves relative paths against the root', () => {
    expect(resolveFilePath('src/App.tsx', '/project', ['/project'])).toBe(
      resolve('/project', 'src', 'App.tsx'),
    )
  })
})
