import { posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { HtmlTagDescriptor, Plugin } from 'vite'
import { IDE_ORDER, OPEN_ENDPOINT, SOURCE_ATTR } from '../shared/index.js'
import type { LocatorIde, LocatorThemeInput } from '../shared/index.js'
import { babelPluginAddSourceAttr } from './babel-plugin.js'
import { createOpenHandler } from './open-handler.js'

export type SourceLocatorOptions = {
  enabled?: boolean
  endpoint?: string
  attribute?: string
  ides?: LocatorIde[]
  theme?: LocatorThemeInput
}

type ClientInjection = {
  endpoint: string
  attribute: string
  theme?: LocatorThemeInput
  root?: string
}

const VIRTUAL_CLIENT_ID = 'virtual:source-locator-client'
const RESOLVED_VIRTUAL_CLIENT_ID = '\0virtual:source-locator-client'
const CLIENT_ENTRY = fileURLToPath(new URL('../client/index.js', import.meta.url))
const DEFAULT_BASE = '/'

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

function hasBabelPlugin(plugins: unknown[]): boolean {
  return plugins.some((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) === babelPluginAddSourceAttr)
}

function configScriptTag(clientConfig: ClientInjection): HtmlTagDescriptor {
  const json = JSON.stringify(clientConfig).replace(/</g, '\\u003c')
  return {
    tag: 'script',
    children: `window.__SOURCE_LOCATOR_CONFIG__=${json}`,
    injectTo: 'head',
  }
}

// Vite's base middleware 404s any resource that does not start with `base`, so the
// client script URL must carry it (Vite joins base onto its own `@vite/client` too).
function clientScriptTag(base: string): HtmlTagDescriptor {
  return {
    tag: 'script',
    attrs: { type: 'module', src: posix.join(base, `@id/${VIRTUAL_CLIENT_ID}`) },
    injectTo: 'body',
  }
}

function sourceLocator(options: SourceLocatorOptions = {}): Plugin {
  const config = resolveOptions(options)
  const clientConfig: ClientInjection = {
    endpoint: config.endpoint,
    attribute: config.attribute,
    theme: config.theme,
  }
  let base = DEFAULT_BASE

  return {
    name: 'source-locator',
    apply: 'serve',

    configResolved(resolved) {
      clientConfig.root = resolved.root
      base = resolved.base
    },

    api: {
      reactBabel(babelConfig: ReactBabelConfig) {
        if (!config.enabled) return
        if (hasBabelPlugin(babelConfig.plugins)) return
        babelConfig.plugins.push([babelPluginAddSourceAttr, { attribute: config.attribute }])
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
      // Files are opened from the same directories Vite is allowed to serve, so
      // monorepo sources outside `root` (workspace siblings) work too.
      const handler = createOpenHandler({
        root: server.config.root,
        allowedRoots: [server.config.root, ...server.config.server.fs.allow],
        ides: config.ides,
      })
      // An unexpected throw goes to Vite's error middleware instead of becoming an
      // unhandled rejection that would crash the dev server.
      server.middlewares.use(config.endpoint, (req, res, next) => {
        handler(req, res).catch(next)
      })
    },

    transformIndexHtml() {
      if (!config.enabled) return
      return [configScriptTag(clientConfig), clientScriptTag(base)]
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
