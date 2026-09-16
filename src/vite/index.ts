import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { IDE_ORDER, OPEN_ENDPOINT, SOURCE_ATTR } from '../shared/index.js'
import type { LocatorIde, LocatorThemeInput } from '../shared/index.js'
import { babelPluginAddSourceAttr } from './babel-plugin.js'
import { openInEditor } from './editors.js'
import {
  isAllowedRequest,
  isInsideRoot,
  readQuery,
  resolveFilePath,
} from './open-endpoint.js'

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

function sourceLocator(options: SourceLocatorOptions = {}): Plugin {
  const config = resolveOptions(options)
  const clientConfig: {
    endpoint: string
    attribute: string
    theme?: LocatorThemeInput
    root?: string
  } = {
    endpoint: config.endpoint,
    attribute: config.attribute,
    theme: config.theme,
  }

  return {
    name: 'source-locator',
    apply: 'serve',

    configResolved(resolved) {
      clientConfig.root = resolved.root
    },

    api: {
      reactBabel(babelConfig: ReactBabelConfig) {
        if (!config.enabled) return
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
      if (!config.enabled) return
      server.middlewares.use(config.endpoint, (req, res) => {
        if (!isAllowedRequest(req)) {
          res.writeHead(403)
          res.end('forbidden')
          return
        }

        let file: string | null
        let line: string
        let col: string
        let ide: string
        try {
          ;({ file, line, col, ide } = readQuery(req.url ?? '', config.ides[0] ?? 'auto'))
        } catch {
          res.writeHead(400)
          res.end('invalid request')
          return
        }

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
  // Unlike the plugin above (`apply: 'serve'`), this helper is wired directly into
  // react()'s babel config at vite.config authoring time, before Vite has resolved
  // the command — so a production build would otherwise bake absolute source paths
  // into every element's data-source attribute. Fail closed: only enable when
  // NODE_ENV is explicitly 'development'. Vite's CLI sets that for `vite`/`vite
  // dev`; staging, unset, or any other value must not inject paths into bundles.
  if (options.enabled === false || process.env.NODE_ENV !== 'development') {
    return { babel: { plugins: [] } }
  }
  const attribute = options.attribute ?? SOURCE_ATTR
  return { babel: { plugins: [[babelPluginAddSourceAttr, { attribute }]] } }
}

export { sourceLocator }
