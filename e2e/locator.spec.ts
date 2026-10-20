import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { clearEditorLog, readEditorArgs } from './editor-log.js'

const APP_FILE = resolve(import.meta.dirname, '../playground/src/App.tsx')
const HIGHLIGHT_PADDING = 2

const badge = (page: Page) => page.locator('#source-locator-badge')
const tooltip = (page: Page) => page.locator('#source-locator-tooltip')
const highlight = (page: Page) => page.locator('#source-locator-highlight')
const counter = (page: Page) => page.getByRole('button', { name: /Clicked/ })
const bodyCursor = (page: Page) => page.evaluate(() => document.body.style.cursor)
const clipboardText = (page: Page) => page.evaluate(() => navigator.clipboard.readText())

const READABLE_TOOLTIP_WIDTH = 200

// Reads the tooltip from inside the overlay's shadow root: is the whole box on
// screen, does the text stay inside the box, and is the box wide enough to read
// (a fixed box squeezed against the edge wraps into a one-word column).
const tooltipLayout = (page: Page) =>
  page.evaluate((readableWidth) => {
    const host = document.getElementById('source-locator-host')
    const tip = host?.shadowRoot?.getElementById('source-locator-tooltip')
    const box = tip?.getBoundingClientRect()
    const viewport = document.documentElement
    return {
      insideViewport:
        Boolean(box) &&
        (box?.left ?? -1) >= 0 &&
        (box?.top ?? -1) >= 0 &&
        (box?.right ?? Infinity) <= viewport.clientWidth &&
        (box?.bottom ?? Infinity) <= viewport.clientHeight,
      textFits: Boolean(tip) && (tip?.scrollWidth ?? Infinity) <= (tip?.clientWidth ?? 0),
      readable: (box?.width ?? 0) >= readableWidth,
    }
  }, READABLE_TOOLTIP_WIDTH)

const FITS = { insideViewport: true, textFits: true, readable: true }

async function enablePick(page: Page) {
  await badge(page).click()
  await expect(badge(page)).toHaveText('Picking — Esc')
}

test.beforeEach(async ({ page, context }) => {
  clearEditorLog()
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
})

test('injects the badge and toggles pick mode with the badge and Esc', async ({ page }) => {
  await expect(badge(page)).toHaveText('Locator')

  await enablePick(page)
  await expect.poll(() => bodyCursor(page)).toBe('crosshair')

  await page.keyboard.press('Escape')
  await expect(badge(page)).toHaveText('Locator')
  await expect.poll(() => bodyCursor(page)).toBe('')
  await expect(tooltip(page)).toHaveCount(0)
})

test('hover shows the source tooltip and a highlight', async ({ page }) => {
  await enablePick(page)

  await counter(page).hover()

  await expect(tooltip(page)).toContainText('App.tsx:27')
  await expect(highlight(page)).toBeVisible()
})

test('hovering a nested element resolves to its own JSX line', async ({ page }) => {
  await enablePick(page)

  await page.getByText('Inner target').hover()

  await expect(tooltip(page)).toContainText('App.tsx:40')
})

test('click opens the source in the editor at the JSX position', async ({ page }) => {
  await enablePick(page)

  await counter(page).click()

  await expect.poll(readEditorArgs).toEqual([APP_FILE, '27', '11'])
  await expect(counter(page)).toHaveText('Clicked 0')
})

test('Shift+Click copies the compact prompt without opening the editor', async ({ page }) => {
  await enablePick(page)

  await counter(page).click({ modifiers: ['Shift'] })

  await expect(tooltip(page)).toHaveText('Copied for AI')
  expect(await clipboardText(page)).toBe(
    'Source: src/App.tsx:27:11\nElement: <button type="button" class="btn">Clicked 0</button>',
  )
  expect(readEditorArgs()).toEqual([])
})

test('Alt+Shift+Click copies the expanded prompt', async ({ page }) => {
  await enablePick(page)

  await counter(page).click({ modifiers: ['Alt', 'Shift'] })

  await expect(tooltip(page)).toHaveText('Copied expanded')
  const prompt = await clipboardText(page)
  expect(prompt).toContain('Source: src/App.tsx:27:11')
  expect(prompt).toContain('Path: ')
  expect(prompt).toContain('Styles: ')
  expect(prompt).toContain('Box: ')
})

test('picking inside an outside-click dialog keeps the dialog open', async ({ page }) => {
  await page.getByRole('button', { name: 'Open dialog' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  await enablePick(page)
  await page.mouse.click(5, 5)
  await page.getByRole('button', { name: 'Close' }).click({ modifiers: ['Shift'] })

  await expect(dialog).toBeVisible()
  expect(await clipboardText(page)).toContain('ConfirmDialog.tsx:37')
})

test('the highlight follows the element when the page scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 520 })
  await enablePick(page)
  await counter(page).hover()
  await expect(highlight(page)).toBeVisible()

  await page.evaluate(() => window.scrollBy(0, 10))

  const target = await counter(page).boundingBox()
  await expect
    .poll(async () => (await highlight(page).boundingBox())?.y)
    .toBeCloseTo((target?.y ?? 0) - HIGHLIGHT_PADDING, 0)
})

test('on desktop the hint text stays inside the tooltip box', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await enablePick(page)

  await counter(page).hover()

  await expect(tooltip(page)).toContainText('App.tsx:27')
  expect(await tooltipLayout(page)).toEqual(FITS)
})

test('on a phone the tooltip stays readable on screen when hovering at the right edge', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await enablePick(page)
  const card = await page.locator('article').first().boundingBox()

  await page.mouse.move((card?.x ?? 0) + (card?.width ?? 0) - 3, (card?.y ?? 0) + 10)

  await expect(tooltip(page)).toBeVisible()
  expect(await tooltipLayout(page)).toEqual(FITS)
})

test('the tooltip flips above the cursor at the bottom edge', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const inner = page.getByText('Inner target')
  const box = await inner.boundingBox()
  await page.setViewportSize({ width: 375, height: Math.round((box?.y ?? 0) + (box?.height ?? 0) + 4) })
  await enablePick(page)

  await page.mouse.move((box?.x ?? 0) + 20, (box?.y ?? 0) + (box?.height ?? 0) - 2)

  await expect(tooltip(page)).toContainText('App.tsx:40')
  expect(await tooltipLayout(page)).toEqual(FITS)
})

test.describe('with a non-root Vite base', () => {
  test.use({ baseURL: 'http://localhost:5181' })

  test('loads the client and opens the editor', async ({ page }) => {
    await page.goto('/app/')
    await enablePick(page)

    await counter(page).click()

    await expect.poll(readEditorArgs).toEqual([APP_FILE, '27', '11'])
  })
})
