import { beforeEach, describe, expect, it, vi } from 'vitest'
import { startPickController } from '../../src/client/controller.js'
import { UI_IDS } from '../../src/client/overlay-styles.js'

function composedClick() {
  return new MouseEvent('click', { bubbles: true, cancelable: true, composed: true })
}

function composedPointerDown() {
  return new Event('pointerdown', { bubbles: true, cancelable: true, composed: true })
}

describe('startPickController', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.body.style.cursor = ''
    vi.restoreAllMocks()
  })

  it('resets cursor and removes listeners on dispose', () => {
    const host = document.createElement('div')
    const root = host.attachShadow({ mode: 'open' })
    document.body.appendChild(host)

    const dispose = startPickController(root, host, {
      endpoint: '/__open-in-editor',
      attribute: 'data-source',
    })

    const badge = root.getElementById(UI_IDS.badge)!
    badge.dispatchEvent(composedClick())
    expect(document.body.style.cursor).toBe('crosshair')

    dispose()
    expect(document.body.style.cursor).toBe('')
    expect(root.getElementById(UI_IDS.tooltip)).toBeNull()
  })

  it('does not close capture-phase dialogs when clicking the badge', () => {
    const dismiss = vi.fn()
    document.addEventListener('pointerdown', dismiss, true)

    const host = document.createElement('div')
    const root = host.attachShadow({ mode: 'open' })
    document.body.appendChild(host)

    const dispose = startPickController(root, host, {
      endpoint: '/__open-in-editor',
      attribute: 'data-source',
    })

    const badge = root.getElementById(UI_IDS.badge)!
    const pointer = composedPointerDown()
    badge.dispatchEvent(pointer)

    expect(pointer.defaultPrevented).toBe(true)
    expect(dismiss).not.toHaveBeenCalled()

    badge.dispatchEvent(composedClick())
    expect(document.body.style.cursor).toBe('crosshair')

    dispose()
    document.removeEventListener('pointerdown', dismiss, true)
  })

  it('suppresses pointerdown and click on the page while picking', async () => {
    const host = document.createElement('div')
    const root = host.attachShadow({ mode: 'open' })
    document.body.appendChild(host)

    const button = document.createElement('button')
    button.setAttribute('data-source', '/app/src/Button.tsx:1:1')
    document.body.appendChild(button)

    const pageClick = vi.fn()
    const pagePointer = vi.fn()
    button.addEventListener('click', pageClick)
    button.addEventListener('pointerdown', pagePointer)

    const fetchMock = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('fetch', fetchMock)

    const dispose = startPickController(root, host, {
      endpoint: '/__open-in-editor',
      attribute: 'data-source',
    })

    root.getElementById(UI_IDS.badge)!.dispatchEvent(composedClick())

    const pointer = composedPointerDown()
    button.dispatchEvent(pointer)
    expect(pointer.defaultPrevented).toBe(true)
    expect(pagePointer).not.toHaveBeenCalled()

    const click = composedClick()
    button.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(true)
    expect(pageClick).not.toHaveBeenCalled()

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    expect(String(fetchMock.mock.calls[0][0])).toContain('/__open-in-editor')

    dispose()
  })

  it('blocks capture-phase document dismissers while picking', () => {
    const dismiss = vi.fn()
    document.addEventListener('pointerdown', dismiss, true)

    const host = document.createElement('div')
    const root = host.attachShadow({ mode: 'open' })
    document.body.appendChild(host)

    const button = document.createElement('button')
    button.setAttribute('data-source', '/app/src/Button.tsx:1:1')
    document.body.appendChild(button)

    const dispose = startPickController(root, host, {
      endpoint: '/__open-in-editor',
      attribute: 'data-source',
    })

    root.getElementById(UI_IDS.badge)!.dispatchEvent(composedClick())

    const pointer = composedPointerDown()
    button.dispatchEvent(pointer)

    expect(pointer.defaultPrevented).toBe(true)
    expect(dismiss).not.toHaveBeenCalled()

    dispose()
    document.removeEventListener('pointerdown', dismiss, true)
  })
})
