import { beforeEach, describe, expect, it } from 'vitest'
import { startPickController } from '../../src/client/controller.js'
import { UI_IDS } from '../../src/client/overlay-styles.js'

describe('startPickController dispose', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.body.style.cursor = ''
  })

  it('resets cursor and removes listeners on dispose', () => {
    const host = document.createElement('div')
    const root = host.attachShadow({ mode: 'open' })
    document.body.appendChild(host)

    const dispose = startPickController(root, host, {
      endpoint: '/__open-in-editor',
      attribute: 'data-source',
    })

    root.getElementById(UI_IDS.badge)?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(document.body.style.cursor).toBe('crosshair')

    dispose()
    expect(document.body.style.cursor).toBe('')
    expect(root.getElementById(UI_IDS.tooltip)).toBeNull()
  })
})
