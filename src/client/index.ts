import { startPickController } from './controller.js'
import type { ClientConfig } from './controller.js'

declare global {
  interface Window {
    __sourceLocator?: { dispose: () => void }
    __SOURCE_LOCATOR_CONFIG__?: ClientConfig
  }
}

const HOST_ID = 'source-locator-host'

export function initSourceLocator(config: ClientConfig): void {
  if (window.__sourceLocator || document.getElementById(HOST_ID)) return

  const host = document.createElement('div')
  host.id = HOST_ID
  const root = host.attachShadow({ mode: 'open' })
  document.body.appendChild(host)

  const disposeController = startPickController(root, host, config)
  window.__sourceLocator = {
    dispose: () => {
      disposeController()
      host.remove()
      delete window.__sourceLocator
    },
  }
}

const injected = window.__SOURCE_LOCATOR_CONFIG__
if (injected) initSourceLocator(injected)
