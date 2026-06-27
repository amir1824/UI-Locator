export const UI_IDS = {
  badge: 'source-locator-badge',
  tooltip: 'source-locator-tooltip',
  highlight: 'source-locator-highlight',
} as const

export const HOST_LAYOUT = {
  position: 'fixed',
  inset: '0',
  zIndex: '99999',
  pointerEvents: 'none',
} as const

export const LAYOUT = {
  badge: {
    position: 'fixed',
    bottom: '12px',
    right: '12px',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '12px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    zIndex: '99999',
    cursor: 'pointer',
    pointerEvents: 'auto',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.08)',
  },
  tooltip: {
    position: 'fixed',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    zIndex: '99999',
    pointerEvents: 'none',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
    maxWidth: '420px',
    whiteSpace: 'pre',
    lineHeight: '1.5',
  },
  highlight: {
    position: 'fixed',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderRadius: '4px',
    pointerEvents: 'none',
    zIndex: '99998',
  },
} as const
