import type { LocatorContext } from '../context/context.js'

export type SelectAction = 'open' | 'copy'

export type SelectHandler = (
  context: LocatorContext,
  meta: { action: SelectAction },
) => void

export type SelectBus = {
  onSelect: (handler: SelectHandler) => () => void
  notify: (context: LocatorContext, action: SelectAction) => void
  clear: () => void
}

export function createSelectBus(): SelectBus {
  const handlers = new Set<SelectHandler>()

  return {
    onSelect: (handler) => {
      handlers.add(handler)
      return () => {
        handlers.delete(handler)
      }
    },
    notify: (context, action) => {
      for (const handler of handlers) {
        try {
          handler(context, { action })
        } catch {
          // Subscriber errors must not abort overlay UX or sibling handlers.
        }
      }
    },
    clear: () => {
      handlers.clear()
    },
  }
}
