// @vitest-environment node
import { existsSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createServer } from 'vite'

vi.mock('../../src/vite/editors.js', () => ({
  openInEditor: vi.fn(),
}))

import { IDE_ORDER } from '../../src/shared/index.js'
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
    expect(openInEditor).toHaveBeenCalledWith(
      { file: filePath, line: '1', col: '1' },
      'cursor',
      IDE_ORDER,
    )
    expect(existsSync(filePath)).toBe(true)

    await server.close()
  })

  it('opens editor for absolute file paths inside project root', async () => {
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
      `http://localhost:${port}/__open-in-editor?file=${encodeURIComponent(filePath)}&line=2&col=3&ide=vscode`,
    )

    expect(response.status).toBe(200)
    expect(openInEditor).toHaveBeenCalledWith(
      { file: filePath, line: '2', col: '3' },
      'vscode',
      IDE_ORDER,
    )

    await server.close()
  })

  it('returns 403 for files outside project root', async () => {
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
    const outsidePath = join(tmpdir(), 'outside.tsx')
    writeFileSync(outsidePath, '<div />')

    const response = await fetch(
      `http://localhost:${port}/__open-in-editor?file=${encodeURIComponent(outsidePath)}&line=1&col=1`,
    )

    expect(response.status).toBe(403)
    expect(await response.text()).toBe('outside project')
    expect(openInEditor).not.toHaveBeenCalled()

    await server.close()
  })

  it('returns 403 for path traversal outside project root', async () => {
    const server = await createServer({
      root,
      plugins: [sourceLocator()],
      logLevel: 'silent',
    })
    await server.listen()

    const port = server.config.server.port
    const response = await fetch(
      `http://localhost:${port}/__open-in-editor?file=${encodeURIComponent('../../etc/passwd')}&line=1&col=1`,
    )

    expect(response.status).toBe(403)
    expect(await response.text()).toBe('outside project')
    expect(openInEditor).not.toHaveBeenCalled()

    await server.close()
  })

  it('returns 403 for cross-origin requests', async () => {
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
      `http://localhost:${port}/__open-in-editor?file=/src/App.tsx&line=1&col=1`,
      { headers: { Origin: 'https://evil.example' } },
    )

    expect(response.status).toBe(403)
    expect(await response.text()).toBe('forbidden')
    expect(openInEditor).not.toHaveBeenCalled()

    await server.close()
  })

  it('defaults to vscode when ides is vscode only', async () => {
    mkdirSync(join(root, 'src'), { recursive: true })
    const filePath = join(root, 'src', 'App.tsx')
    writeFileSync(filePath, '<div />')

    const server = await createServer({
      root,
      plugins: [sourceLocator({ ides: ['vscode'] })],
      logLevel: 'silent',
    })
    await server.listen()

    const port = server.config.server.port
    const response = await fetch(
      `http://localhost:${port}/__open-in-editor?file=/src/App.tsx&line=1&col=1`,
    )

    expect(response.status).toBe(200)
    expect(openInEditor).toHaveBeenCalledWith(
      { file: filePath, line: '1', col: '1' },
      'vscode',
      ['vscode'],
    )

    await server.close()
  })
})
