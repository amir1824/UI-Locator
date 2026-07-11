import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startPickController } from '../../src/client/controller.js'
import { UI_IDS } from '../../src/client/overlay-styles.js'

function mountLocator() {
  const host = document.createElement('div')
  const root = host.attachShadow({ mode: 'open' })
  document.body.appendChild(host)

  const dispose = startPickController(root, host, {
    endpoint: '/__open-in-editor',
    attribute: 'data-source',
  })

  const enterPickMode = () =>
    root.getElementById(UI_IDS.badge)?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

  return { dispose, enterPickMode }
}

describe('startPickController dispose', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.body.style.cursor = ''
  })

  it('resets cursor and removes listeners on dispose', () => {
    const { dispose, enterPickMode } = mountLocator()

    enterPickMode()
    expect(document.body.style.cursor).toBe('crosshair')

    dispose()
    expect(document.body.style.cursor).toBe('')
    expect(document.querySelector(`#${UI_IDS.tooltip}`)).toBeNull()
  })
})

describe('startPickController pick interaction', () => {
  let dispose: () => void

  beforeEach(() => {
    document.body.innerHTML = ''
    document.body.style.cursor = ''
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true } as Response),
    )
  })

  afterEach(() => {
    dispose?.()
    vi.unstubAllGlobals()
  })

  it('opens the source file on pointerdown, before any later click fires', () => {
    const controller = mountLocator()
    dispose = controller.dispose
    controller.enterPickMode()

    const target = document.createElement('button')
    target.setAttribute('data-source', 'src/App.tsx:3:1')
    document.body.appendChild(target)

    target.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }),
    )

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(String((fetch as ReturnType<typeof vi.fn>).mock.calls[0][0])).toContain(
      'file=src%2FApp.tsx',
    )
  })

  it('never lets a dialog-style outside-mousedown-close listener run while picking', () => {
    const controller = mountLocator()
    dispose = controller.dispose
    controller.enterPickMode()

    const target = document.createElement('button')
    target.setAttribute('data-source', 'src/App.tsx:3:1')
    document.body.appendChild(target)

    const onOutsideMouseDown = vi.fn()
    document.addEventListener('mousedown', onOutsideMouseDown)

    target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))

    expect(onOutsideMouseDown).not.toHaveBeenCalled()
    document.removeEventListener('mousedown', onOutsideMouseDown)
  })

  it('ignores a second pointerdown while the first open request is still in flight', async () => {
    let resolveFetch: (() => void) | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveFetch = () => resolve({ ok: true } as Response)
          }),
      ),
    )

    const controller = mountLocator()
    dispose = controller.dispose
    controller.enterPickMode()

    const target = document.createElement('button')
    target.setAttribute('data-source', 'src/App.tsx:3:1')
    document.body.appendChild(target)

    target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))

    expect(fetch).toHaveBeenCalledTimes(1)
    resolveFetch?.()
    await Promise.resolve()
  })
})
