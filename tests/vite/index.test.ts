// @vitest-environment node
import { existsSync, mkdtempSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createServer } from 'vite'

vi.mock('../../src/vite/editors.js', () => ({
  openInEditor: vi.fn(),
}))

import { IDE_ORDER } from '../../src/shared/index.js'
import { openInEditor } from '../../src/vite/editors.js'
import { sourceLocator } from '../../src/vite/index.js'

const CLIENT_ENTRY = fileURLToPath(new URL('../../src/client/index.js', import.meta.url))

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
    expect(loaded).toBe(`import ${JSON.stringify(CLIENT_ENTRY)}`)

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

  it('sanitizes non-numeric line/col to 1 before reaching the editor launcher', async () => {
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
      `http://localhost:${port}/__open-in-editor?file=/src/App.tsx&line=${encodeURIComponent('1; rm -rf /')}&col=${encodeURIComponent('2 & calc')}`,
    )

    expect(response.status).toBe(200)
    expect(openInEditor).toHaveBeenCalledWith(
      { file: filePath, line: '1', col: '1' },
      'auto',
      IDE_ORDER,
    )

    await server.close()
  })

  it('returns 403 for same-site cross-port requests (Fetch Metadata)', async () => {
    mkdirSync(join(root, 'src'), { recursive: true })
    writeFileSync(join(root, 'src', 'App.tsx'), '<div />')

    const server = await createServer({
      root,
      plugins: [sourceLocator()],
      logLevel: 'silent',
    })
    await server.listen()

    const port = server.config.server.port
    const response = await fetch(
      `http://localhost:${port}/__open-in-editor?file=/src/App.tsx&line=1&col=1`,
      { headers: { 'Sec-Fetch-Site': 'same-site' } },
    )

    expect(response.status).toBe(403)
    expect(openInEditor).not.toHaveBeenCalled()

    await server.close()
  })

  it('returns 403 for Sec-Fetch-Site none (navigations from Slack/email)', async () => {
    mkdirSync(join(root, 'src'), { recursive: true })
    writeFileSync(join(root, 'src', 'App.tsx'), '<div />')

    const server = await createServer({
      root,
      plugins: [sourceLocator()],
      logLevel: 'silent',
    })
    await server.listen()

    const port = server.config.server.port
    const response = await fetch(
      `http://localhost:${port}/__open-in-editor?file=/src/App.tsx&line=1&col=1`,
      { headers: { 'Sec-Fetch-Site': 'none' } },
    )

    expect(response.status).toBe(403)
    expect(openInEditor).not.toHaveBeenCalled()

    await server.close()
  })

  it('returns 403 instead of crashing on a malformed Origin header', async () => {
    mkdirSync(join(root, 'src'), { recursive: true })
    writeFileSync(join(root, 'src', 'App.tsx'), '<div />')

    const server = await createServer({
      root,
      plugins: [sourceLocator()],
      logLevel: 'silent',
    })
    await server.listen()

    const port = server.config.server.port
    const response = await fetch(
      `http://localhost:${port}/__open-in-editor?file=/src/App.tsx&line=1&col=1`,
      { headers: { Origin: 'null' } },
    )

    expect(response.status).toBe(403)
    expect(openInEditor).not.toHaveBeenCalled()

    await server.close()
  })

  it('does not register the endpoint or reactBabel hook when disabled', async () => {
    const server = await createServer({
      root,
      plugins: [sourceLocator({ enabled: false })],
      logLevel: 'silent',
    })
    await server.listen()

    const babelConfig = { plugins: [] as unknown[] }
    const plugin = server.config.plugins.find((p) => p.name === 'source-locator')
    const api = plugin?.api as { reactBabel?: (config: typeof babelConfig) => void } | undefined
    api?.reactBabel?.(babelConfig)
    expect(babelConfig.plugins).toHaveLength(0)

    const port = server.config.server.port
    const response = await fetch(
      `http://localhost:${port}/__open-in-editor?file=/src/App.tsx&line=1&col=1`,
    )

    // With the plugin disabled, our middleware never runs — Vite's own SPA
    // fallback answers instead, so this is not the plugin's 200/'ok' response.
    expect(await response.text()).not.toBe('ok')
    expect(openInEditor).not.toHaveBeenCalled()

    await server.close()
  })

  it.skipIf(process.platform === 'win32')(
    'returns 403 for a symlink that escapes the project root',
    async () => {
      mkdirSync(join(root, 'src'), { recursive: true })
      const outsideFile = join(tmpdir(), `source-locator-outside-${Date.now()}.tsx`)
      writeFileSync(outsideFile, '<div />')
      const linkPath = join(root, 'src', 'Escape.tsx')
      symlinkSync(outsideFile, linkPath)

      const server = await createServer({
        root,
        plugins: [sourceLocator()],
        logLevel: 'silent',
      })
      await server.listen()

      const port = server.config.server.port
      const response = await fetch(
        `http://localhost:${port}/__open-in-editor?file=/src/Escape.tsx&line=1&col=1`,
      )

      expect(response.status).toBe(403)
      expect(openInEditor).not.toHaveBeenCalled()

      await server.close()
    },
  )

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

describe('sourceLocator.babel', () => {
  const originalNodeEnv = process.env.NODE_ENV

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalNodeEnv
  })

  it('registers the babel plugin in development', () => {
    process.env.NODE_ENV = 'development'
    expect(sourceLocator.babel().babel.plugins).toHaveLength(1)
  })

  it('registers no babel plugin in production (would leak absolute source paths)', () => {
    process.env.NODE_ENV = 'production'
    expect(sourceLocator.babel().babel.plugins).toHaveLength(0)
  })

  it('registers no babel plugin when NODE_ENV is unset', () => {
    delete process.env.NODE_ENV
    expect(sourceLocator.babel().babel.plugins).toHaveLength(0)
  })

  it('registers no babel plugin for staging (fail-closed allowlist)', () => {
    process.env.NODE_ENV = 'staging'
    expect(sourceLocator.babel().babel.plugins).toHaveLength(0)
  })

  it('registers no babel plugin when enabled is explicitly false', () => {
    process.env.NODE_ENV = 'development'
    expect(sourceLocator.babel({ enabled: false }).babel.plugins).toHaveLength(0)
  })
})
