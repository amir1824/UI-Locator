import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { clearEditorLog, readEditorArgs } from './editor-log.js'

const APP_FILE = resolve(import.meta.dirname, '../playground/src/App.tsx')
const ENDPOINT = '/__open-in-editor'

test.beforeEach(() => {
  clearEditorLog()
})

test('opens a project file for a same-origin request', async ({ request }) => {
  const response = await request.get(`${ENDPOINT}?file=src/App.tsx&line=5&col=3`)

  expect(response.status()).toBe(200)
  await expect.poll(readEditorArgs).toEqual([APP_FILE, '5', '3'])
})

test('reduces non-numeric line and column to 1 before they reach the editor', async ({
  request,
}) => {
  const response = await request.get(
    `${ENDPOINT}?file=src/App.tsx&line=${encodeURIComponent('1; rm -rf ~')}&col=${encodeURIComponent('$(id)')}`,
  )

  expect(response.status()).toBe(200)
  await expect.poll(readEditorArgs).toEqual([APP_FILE, '1', '1'])
})

test('rejects cross-site requests', async ({ request }) => {
  const response = await request.get(`${ENDPOINT}?file=src/App.tsx`, {
    headers: { 'Sec-Fetch-Site': 'cross-site' },
  })

  expect(response.status()).toBe(403)
  expect(readEditorArgs()).toEqual([])
})

test('rejects a foreign Origin', async ({ request }) => {
  const response = await request.get(`${ENDPOINT}?file=src/App.tsx`, {
    headers: { Origin: 'https://evil.example' },
  })

  expect(response.status()).toBe(403)
  expect(readEditorArgs()).toEqual([])
})

test('rejects path traversal out of the project', async ({ request }) => {
  const response = await request.get(`${ENDPOINT}?file=${encodeURIComponent('../../../etc/hosts')}`)

  expect(response.status()).toBe(403)
  expect(readEditorArgs()).toEqual([])
})

test('answers the same for existing and missing files outside the project', async ({
  request,
}) => {
  const existing = await request.get(`${ENDPOINT}?file=/etc/hosts`)
  const missing = await request.get(`${ENDPOINT}?file=/etc/source-locator-missing`)

  expect(existing.status()).toBe(404)
  expect(missing.status()).toBe(404)
  expect(readEditorArgs()).toEqual([])
})
