// @vitest-environment node
import { existsSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createServer } from 'vite'

vi.mock('../../src/vite/editors.js', () => ({
  openInEditor: vi.fn(),
}))

import { openInEditor } from '../../src/vite/editors.js'
import { sourceLocator } from '../../src/vite/index.js'

describe('sourceLocator vite plugin', () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'source-locator-'))
    writeFileSync(join(root, 'index.html'), '<html><body></body></html>')
    vi.mocked(openInEditor).mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('resolves the virtual client module', async () => {
    const server = await createServer({
      root,
      plugins: [sourceLocator()],
      logLevel: 'silent',
    })

    const resolved = await server.pluginContainer.resolveId('virtual:source-locator-client')
    expect(resolved?.id).toBe('\0virtual:source-locator-client')

    const loaded = await server.pluginContainer.load(resolved!.id)
    expect(loaded).toContain('client/index.js')

    await server.close()
  })

  it('returns 400 when file query param is missing', async () => {
    const server = await createServer({
      root,
      plugins: [sourceLocator()],
      logLevel: 'silent',
    })
    await server.listen()

    const response = await fetch(`http://localhost:${server.config.server.port}/__open-in-editor`)
    expect(response.status).toBe(400)

    await server.close()
  })

  it('returns 404 when file does not exist', async () => {
    const server = await createServer({
      root,
      plugins: [sourceLocator()],
      logLevel: 'silent',
    })
    await server.listen()

    const port = server.config.server.port
    const response = await fetch(
      `http://localhost:${port}/__open-in-editor?file=missing.tsx&line=1&col=1`,
    )
    expect(response.status).toBe(404)

    await server.close()
  })

  it('opens editor and returns 200 for existing files', async () => {
    mkdirSync(join(root, 'src'), { recursive: true })
    const filePath = join(root, 'src', 'App.tsx')
    writeFileSync(filePath, '<div />')

    const server = await createServer({
      root,
      plugins: [sourceLocator()],
      logLevel: 'silent',
    })
    await server.listen()

    const port = server.config.server.port
    const response = await fetch(
      `http://localhost:${port}/__open-in-editor?file=/src/App.tsx&line=1&col=1&ide=cursor`,
    )

    expect(response.status).toBe(200)
    expect(openInEditor).toHaveBeenCalledOnce()
    expect(existsSync(filePath)).toBe(true)

    await server.close()
  })
})
