import {
  contextToPrompt,
  copyContextForAI,
  getElementContext,
  writeContextPrompt,
} from './context/context.js'
import type {
  ContextDetail,
  GetContextOptions,
  LocatorContext,
} from './context/context.js'
import { startPickController } from './pick/controller.js'
import type { ClientConfig, PickController } from './pick/controller.js'
import type { SelectAction, SelectHandler } from './pick/select-bus.js'
import { HOST_LAYOUT } from './overlay/styles.js'
import { expandedModifierLabel, isApplePlatform } from './platform.js'

export type {
  ContextDetail,
  GetContextOptions,
  LocatorContext,
  SelectAction,
  SelectHandler,
}
export type { ClientConfig, PickController }
export {
  contextToPrompt,
  copyContextForAI,
  expandedModifierLabel,
  getElementContext,
  isApplePlatform,
  writeContextPrompt,
}

declare global {
  interface Window {
    __sourceLocator?: PickController
    __SOURCE_LOCATOR_CONFIG__?: ClientConfig
  }
}

const HOST_ID = 'source-locator-host'

export function initSourceLocator(config: ClientConfig): PickController | undefined {
  if (window.__sourceLocator) return window.__sourceLocator
  if (document.getElementById(HOST_ID)) return

  const host = document.createElement('div')
  host.id = HOST_ID
  Object.assign(host.style, HOST_LAYOUT)
  const root = host.attachShadow({ mode: 'open' })
  document.body.appendChild(host)

  const controller = startPickController(root, host, config)
  const api: PickController = {
    dispose: () => {
      controller.dispose()
      host.remove()
      delete window.__sourceLocator
    },
    inspect: controller.inspect,
    onSelect: controller.onSelect,
  }
  window.__sourceLocator = api
  return api
}

const injected = window.__SOURCE_LOCATOR_CONFIG__
if (injected) initSourceLocator(injected)
