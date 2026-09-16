import { afterEach, describe, expect, it } from 'vitest'
import { initSourceLocator } from '../../src/client/index.js'

describe('initSourceLocator', () => {
  afterEach(() => {
    window.__sourceLocator?.dispose()
    document.body.innerHTML = ''
    delete window.__SOURCE_LOCATOR_CONFIG__
  })

  it('returns the same API on re-init and mounts one host', () => {
    const config = {
      endpoint: '/__open-in-editor',
      attribute: 'data-source',
    }

    const first = initSourceLocator(config)
    const second = initSourceLocator(config)

    expect(first).toBeDefined()
    expect(second).toBe(first)
    expect(document.querySelectorAll('#source-locator-host')).toHaveLength(1)
  })
})
