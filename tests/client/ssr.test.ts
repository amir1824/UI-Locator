// @vitest-environment node
import { describe, expect, it } from 'vitest'

describe('client entry under SSR', () => {
  it('imports without touching window', async () => {
    const entry = await import('../../src/client/index.js')

    expect(entry.getElementContext).toBeTypeOf('function')
  })
})
