import type { IncomingMessage } from 'node:http'
import { existsSync } from 'node:fs'
import { isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { IDE_ORDER, OPEN_ENDPOINT, SOURCE_ATTR } from '../shared/index.js'
import type { LocatorIde, LocatorThemeInput } from '../shared/index.js'
import { babelPluginAddSourceAttr } from './babel-plugin.js'
import { openInEditor } from './editors.js'

export type SourceLocatorOptions = {
  enabled?: boolean
  endpoint?: string
  attribute?: string
  ides?: LocatorIde[]
  theme?: LocatorThemeInput
}

const VIRTUAL_CLIENT_ID = 'virtual:source-locator-client'
const RESOLVED_VIRTUAL_CLIENT_ID = '\0virtual:source-locator-client'
const CLIENT_ENTRY = fileURLToPath(new URL('../client/index.js', import.meta.url))

type ReactBabelConfig = { plugins: unknown[] }

function resolveOptions(options: SourceLocatorOptions = {}) {
  return {
    enabled: options.enabled ?? true,
    endpoint: options.endpoint ?? OPEN_ENDPOINT,
    attribute: options.attribute ?? SOURCE_ATTR,
    ides: options.ides ?? IDE_ORDER,
    theme: options.theme,
  }
}

function readQuery(url: string, defaultIde: LocatorIde) {
  const parsed = new URL(url, 'http://localhost')
  return {
    file: parsed.searchParams.get('file'),
    line: parsed.searchParams.get('line') ?? '1',
    col: parsed.searchParams.get('col') ?? '1',
    ide: parsed.searchParams.get('ide') ?? defaultIde,
  }
}

function isInsideRoot(resolved: string, root: string): boolean {
  const rel = relative(root, resolved)
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
}

function isAllowedRequest(req: IncomingMessage): boolean {
  const origin = req.headers.origin
  const host = req.headers.host
  if (origin && host && new URL(origin).host !== host) return false
  if (req.headers['sec-fetch-site'] === 'cross-site') return false
  return true
}

function resolveFilePath(file: string, root: string): string {
  const viteDevMatch = file.match(/^\/src\/(.+)$/)
  if (viteDevMatch) return resolve(root, 'src', viteDevMatch[1])
  if (isAbsolute(file)) return resolve(file)
  return resolve(root, file)
}

function sourceLocator(options: SourceLocatorOptions = {}): Plugin {
  const config = resolveOptions(options)
  const clientConfig = {
    endpoint: config.endpoint,
    attribute: config.attribute,
    theme: config.theme,
  }

  return {
    name: 'source-locator',
    apply: 'serve',

    api: {
      reactBabel(babelConfig: ReactBabelConfig) {
        const hasPlugin = babelConfig.plugins.some((p) => {
          if (Array.isArray(p)) {
            return p[0] === babelPluginAddSourceAttr
          }
          return p === babelPluginAddSourceAttr
        })
        if (!hasPlugin) {
          babelConfig.plugins.push([babelPluginAddSourceAttr, { attribute: config.attribute }])
        }
      },
    },

    resolveId(id) {
      if (id === VIRTUAL_CLIENT_ID) return RESOLVED_VIRTUAL_CLIENT_ID
      return undefined
    },

    load(id) {
      if (id !== RESOLVED_VIRTUAL_CLIENT_ID) return undefined
      return `import ${JSON.stringify(CLIENT_ENTRY)}`
    },

    configureServer(server) {
      server.middlewares.use(config.endpoint, (req, res) => {
        if (!isAllowedRequest(req)) {
          res.writeHead(403)
          res.end('forbidden')
          return
        }

        const { file, line, col, ide } = readQuery(req.url ?? '', config.ides[0] ?? 'auto')

        if (!file) {
          res.writeHead(400)
          res.end('missing file')
          return
        }

        try {
          const resolvedFile = resolveFilePath(file, server.config.root)
          if (!isInsideRoot(resolvedFile, server.config.root)) {
            res.writeHead(403)
            res.end('outside project')
            return
          }
          if (!existsSync(resolvedFile)) {
            res.writeHead(404)
            res.end('file not found')
            return
          }
          openInEditor({ file: resolvedFile, line, col }, ide, config.ides)
          res.writeHead(200, { 'Content-Type': 'text/plain' })
          res.end('ok')
        } catch {
          res.writeHead(500)
          res.end('failed to open editor')
        }
      })
    },

    transformIndexHtml() {
      if (!config.enabled) return
      return {
        html: '',
        tags: [
          {
            tag: 'script',
            children: `window.__SOURCE_LOCATOR_CONFIG__=${JSON.stringify(clientConfig).replace(/</g, '\\u003c')}`,
            injectTo: 'head',
          },
          {
            tag: 'script',
            attrs: { type: 'module', src: `/@id/${VIRTUAL_CLIENT_ID}` },
            injectTo: 'body',
          },
        ],
      }
    },
  }
}

sourceLocator.babel = (options: SourceLocatorOptions = {}) => {
  const attribute = options.attribute ?? SOURCE_ATTR
  return { babel: { plugins: [[babelPluginAddSourceAttr, { attribute }]] } }
}

export { sourceLocator }
