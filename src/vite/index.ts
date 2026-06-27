import { existsSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { DEFAULT_IDE, IDE_ORDER, OPEN_ENDPOINT, SOURCE_ATTR } from '../shared/index.js'
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

function resolveOptions(options: SourceLocatorOptions = {}) {
  return {
    enabled: options.enabled ?? true,
    endpoint: options.endpoint ?? OPEN_ENDPOINT,
    attribute: options.attribute ?? SOURCE_ATTR,
    ides: options.ides ?? IDE_ORDER,
    theme: options.theme,
  }
}

function readQuery(url: string) {
  const parsed = new URL(url, 'http://localhost')
  return {
    file: parsed.searchParams.get('file'),
    line: parsed.searchParams.get('line') ?? '1',
    col: parsed.searchParams.get('col') ?? '1',
    ide: parsed.searchParams.get('ide') ?? DEFAULT_IDE,
  }
}

function resolveFilePath(file: string, root: string): string {
  const viteDevMatch = file.match(/^\/src\/(.+)$/)
  if (viteDevMatch) return resolve(root, 'src', viteDevMatch[1])
  if (isAbsolute(file)) return file
  return resolve(root, file)
}

function sourceLocator(options: SourceLocatorOptions = {}): Plugin {
  const config = resolveOptions(options)
  const clientConfig = {
    endpoint: config.endpoint,
    attribute: config.attribute,
    ides: config.ides,
    theme: config.theme,
  }

  return {
    name: 'source-locator',
    apply: 'serve',

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
        const { file, line, col, ide } = readQuery(req.url ?? '')

        if (!file) {
          res.writeHead(400)
          res.end('missing file')
          return
        }

        try {
          const resolvedFile = resolveFilePath(file, server.config.root)
          if (!existsSync(resolvedFile)) {
            res.writeHead(404)
            res.end('file not found')
            return
          }
          openInEditor({ file: resolvedFile, line, col }, ide)
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
            children: `window.__SOURCE_LOCATOR_CONFIG__=${JSON.stringify(clientConfig)}`,
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
