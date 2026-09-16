import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startPickController } from '../../src/client/pick/controller.js'
import type { PickController } from '../../src/client/pick/controller.js'
import { UI_IDS } from '../../src/client/overlay/styles.js'

function composedClick(init: MouseEventInit = {}) {
  return new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    composed: true,
    ...init,
  })
}

function composedPointerDown() {
  return new Event('pointerdown', { bubbles: true, cancelable: true, composed: true })
}

describe('startPickController', () => {
  let controller: PickController | undefined

  beforeEach(() => {
    document.body.innerHTML = ''
    document.body.style.cursor = ''
    vi.restoreAllMocks()
  })

  afterEach(() => {
    controller?.dispose()
    controller = undefined
    document.body.innerHTML = ''
    document.body.style.cursor = ''
  })

  function mountController(config: { root?: string } = {}) {
    const host = document.createElement('div')
    const root = host.attachShadow({ mode: 'open' })
    document.body.appendChild(host)
    controller = startPickController(root, host, {
      endpoint: '/__open-in-editor',
      attribute: 'data-source',
      root: config.root,
    })
    return { host, root, controller }
  }

  it('resets cursor and removes listeners on dispose', () => {
    const { root, controller: api } = mountController()

    const badge = root.getElementById(UI_IDS.badge)!
    badge.dispatchEvent(composedClick())
    expect(document.body.style.cursor).toBe('crosshair')

    api.dispose()
    controller = undefined
    expect(document.body.style.cursor).toBe('')
    expect(root.getElementById(UI_IDS.tooltip)).toBeNull()
  })

  it('does not close capture-phase dialogs when clicking the badge', () => {
    const dismiss = vi.fn()
    document.addEventListener('pointerdown', dismiss, true)

    const { root } = mountController()

    const badge = root.getElementById(UI_IDS.badge)!
    const pointer = composedPointerDown()
    badge.dispatchEvent(pointer)

    expect(pointer.defaultPrevented).toBe(false)
    expect(dismiss).not.toHaveBeenCalled()

    badge.dispatchEvent(composedClick())
    expect(document.body.style.cursor).toBe('crosshair')

    document.removeEventListener('pointerdown', dismiss, true)
  })

  it('suppresses pointerdown and click on the page while picking', async () => {
    const { root } = mountController()

    const button = document.createElement('button')
    button.setAttribute('data-source', '/app/src/Button.tsx:1:1')
    document.body.appendChild(button)

    const pageClick = vi.fn()
    const pagePointer = vi.fn()
    button.addEventListener('click', pageClick)
    button.addEventListener('pointerdown', pagePointer)

    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    root.getElementById(UI_IDS.badge)!.dispatchEvent(composedClick())

    const pointer = composedPointerDown()
    button.dispatchEvent(pointer)
    expect(pointer.defaultPrevented).toBe(false)
    expect(pagePointer).not.toHaveBeenCalled()

    const click = composedClick()
    button.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(true)
    expect(pageClick).not.toHaveBeenCalled()

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    expect(String(fetchMock.mock.calls[0][0])).toContain('/__open-in-editor')
  })

  it('copies AI context on Shift+Click instead of opening the IDE', async () => {
    const { root, controller: api } = mountController()

    const button = document.createElement('button')
    button.textContent = 'Save'
    button.setAttribute('data-source', '/app/src/CheckoutForm.tsx:84:12')
    document.body.appendChild(button)

    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const fetchMock = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('fetch', fetchMock)

    const onSelect = vi.fn()
    api.onSelect(onSelect)

    root.getElementById(UI_IDS.badge)!.dispatchEvent(composedClick())
    button.dispatchEvent(composedClick({ shiftKey: true }))

    await vi.waitFor(() => expect(onSelect).toHaveBeenCalledOnce())
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        source: expect.objectContaining({ file: '/app/src/CheckoutForm.tsx', line: 84 }),
      }),
      { action: 'copy' },
    )
    expect(writeText).toHaveBeenCalledOnce()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(String(writeText.mock.calls[0][0])).toContain('CheckoutForm.tsx:84:12')
  })

  it('relativizes source paths with config.root on copy', async () => {
    const { root, controller: api } = mountController({ root: '/app' })

    const button = document.createElement('button')
    button.setAttribute('data-source', '/app/src/CheckoutForm.tsx:84:12')
    document.body.appendChild(button)

    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    const onSelect = vi.fn()
    api.onSelect(onSelect)

    root.getElementById(UI_IDS.badge)!.dispatchEvent(composedClick())
    button.dispatchEvent(composedClick({ shiftKey: true }))

    await vi.waitFor(() => expect(onSelect).toHaveBeenCalledOnce())
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        source: expect.objectContaining({ file: 'src/CheckoutForm.tsx', line: 84 }),
      }),
      { action: 'copy' },
    )
    expect(String(writeText.mock.calls[0][0])).toContain('Source: src/CheckoutForm.tsx:84:12')
  })

  it('copies expanded AI context on Alt+Shift+Click', async () => {
    const { root, controller: api } = mountController()

    const button = document.createElement('button')
    button.className = 'btn'
    button.textContent = 'Save'
    button.setAttribute('data-source', '/app/src/CheckoutForm.tsx:84:12')
    document.body.appendChild(button)

    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const fetchMock = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('fetch', fetchMock)

    const onSelect = vi.fn()
    api.onSelect(onSelect)

    root.getElementById(UI_IDS.badge)!.dispatchEvent(composedClick())
    button.dispatchEvent(composedClick({ shiftKey: true, altKey: true }))

    await vi.waitFor(() => expect(onSelect).toHaveBeenCalledOnce())
    expect(fetchMock).not.toHaveBeenCalled()
    expect(String(writeText.mock.calls[0][0])).toContain('Styles:')
    expect(String(writeText.mock.calls[0][0])).toContain('Box:')
    expect(root.getElementById(UI_IDS.tooltip)?.textContent).toBe('Copied expanded')
  })

  it('flashes Copy failed when clipboard write rejects', async () => {
    const { root, controller: api } = mountController()

    const button = document.createElement('button')
    button.setAttribute('data-source', '/app/src/Button.tsx:1:1')
    document.body.appendChild(button)

    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const onSelect = vi.fn()
    api.onSelect(onSelect)

    root.getElementById(UI_IDS.badge)!.dispatchEvent(composedClick())
    button.dispatchEvent(composedClick({ shiftKey: true }))

    await vi.waitFor(() => {
      expect(root.getElementById(UI_IDS.tooltip)?.textContent).toBe('Copy failed')
    })
    expect(onSelect).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('notifies onSelect with open action on normal click', async () => {
    const { root, controller: api } = mountController()

    const button = document.createElement('button')
    button.setAttribute('data-source', '/app/src/Button.tsx:2:3')
    document.body.appendChild(button)

    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const onSelect = vi.fn()
    api.onSelect(onSelect)

    root.getElementById(UI_IDS.badge)!.dispatchEvent(composedClick())
    button.dispatchEvent(composedClick())

    await vi.waitFor(() => expect(onSelect).toHaveBeenCalledOnce())
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        source: expect.objectContaining({ file: '/app/src/Button.tsx', line: 2 }),
      }),
      { action: 'open' },
    )
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('opens the IDE with a root-relative file path when config.root is set', async () => {
    const { root } = mountController({ root: '/app' })

    const button = document.createElement('button')
    button.setAttribute('data-source', '/app/src/CheckoutForm.tsx:84:12')
    document.body.appendChild(button)

    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    root.getElementById(UI_IDS.badge)!.dispatchEvent(composedClick())
    button.dispatchEvent(composedClick())

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    const requestUrl = String(fetchMock.mock.calls[0][0])
    const file = new URL(requestUrl, 'http://localhost').searchParams.get('file')
    expect(file).toBe('src/CheckoutForm.tsx')
  })

  it('does not notify open when editor fetch fails', async () => {
    const { root, controller: api } = mountController()

    const button = document.createElement('button')
    button.setAttribute('data-source', '/app/src/Button.tsx:2:3')
    document.body.appendChild(button)

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))

    const onSelect = vi.fn()
    api.onSelect(onSelect)

    root.getElementById(UI_IDS.badge)!.dispatchEvent(composedClick())
    button.dispatchEvent(composedClick())

    await vi.waitFor(() => {
      expect(root.getElementById(UI_IDS.tooltip)?.textContent).toBe('Open failed')
    })
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('does not notify open when editor responds with a non-OK status', async () => {
    const { root, controller: api } = mountController()

    const button = document.createElement('button')
    button.setAttribute('data-source', '/app/src/Button.tsx:2:3')
    document.body.appendChild(button)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))

    const onSelect = vi.fn()
    api.onSelect(onSelect)

    root.getElementById(UI_IDS.badge)!.dispatchEvent(composedClick())
    button.dispatchEvent(composedClick())

    await vi.waitFor(() => {
      expect(root.getElementById(UI_IDS.tooltip)?.textContent).toBe('Open failed')
    })
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('isolates throwing onSelect handlers and still flashes copy success', async () => {
    const { root, controller: api } = mountController()

    const button = document.createElement('button')
    button.setAttribute('data-source', '/app/src/Button.tsx:1:1')
    document.body.appendChild(button)

    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })

    const second = vi.fn()
    api.onSelect(() => {
      throw new Error('subscriber boom')
    })
    api.onSelect(second)

    root.getElementById(UI_IDS.badge)!.dispatchEvent(composedClick())
    button.dispatchEvent(composedClick({ shiftKey: true }))

    await vi.waitFor(() => expect(second).toHaveBeenCalledOnce())
    expect(root.getElementById(UI_IDS.tooltip)?.textContent).toBe('Copied for AI')
  })

  it('stops notifying after onSelect unsubscribe', async () => {
    const { root, controller: api } = mountController()

    const button = document.createElement('button')
    button.setAttribute('data-source', '/app/src/Button.tsx:2:3')
    document.body.appendChild(button)

    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const onSelect = vi.fn()
    const unsubscribe = api.onSelect(onSelect)
    unsubscribe()

    root.getElementById(UI_IDS.badge)!.dispatchEvent(composedClick())
    button.dispatchEvent(composedClick())

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('inspect supports expanded detail', () => {
    const { controller: api } = mountController({ root: '/app' })

    const button = document.createElement('button')
    button.className = 'btn'
    button.textContent = 'Save'
    button.setAttribute('data-source', '/app/src/Button.tsx:2:3')
    document.body.appendChild(button)

    const context = api.inspect(button, { detail: 'expanded' })
    expect(context?.source.file).toBe('src/Button.tsx')
    expect(context?.styles).toBeDefined()
    expect(context?.box).toBeDefined()
    expect(context?.path).toContain('button.btn')
  })

  it('blocks capture-phase document dismissers while picking', () => {
    const dismiss = vi.fn()
    document.addEventListener('pointerdown', dismiss, true)

    const { root } = mountController()

    const button = document.createElement('button')
    button.setAttribute('data-source', '/app/src/Button.tsx:1:1')
    document.body.appendChild(button)

    root.getElementById(UI_IDS.badge)!.dispatchEvent(composedClick())

    const pointer = composedPointerDown()
    button.dispatchEvent(pointer)

    expect(pointer.defaultPrevented).toBe(false)
    expect(dismiss).not.toHaveBeenCalled()

    document.removeEventListener('pointerdown', dismiss, true)
  })
})
