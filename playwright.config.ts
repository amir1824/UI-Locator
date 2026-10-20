import { resolve } from 'node:path'
import { defineConfig, devices } from '@playwright/test'
import { EDITOR_LOG } from './e2e/editor-log.js'

const PORT = 5180
const BASE_PORT = 5181
const PLAYGROUND = 'npx vite --config playground/vite.config.ts --strictPort'

// Every spawn the plugin makes goes to the fake editor, never a real IDE.
const serverEnv = {
  LAUNCH_EDITOR: resolve(import.meta.dirname, 'e2e/fake-editor.sh'),
  E2E_EDITOR_LOG: EDITOR_LOG,
}

export default defineConfig({
  testDir: 'e2e',
  // The fake editor writes one shared log file, so specs must not overlap.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `${PLAYGROUND} --port ${PORT}`,
      url: `http://localhost:${PORT}`,
      env: serverEnv,
      reuseExistingServer: false,
    },
    {
      command: `${PLAYGROUND} --port ${BASE_PORT} --base /app/`,
      url: `http://localhost:${BASE_PORT}/app/`,
      env: serverEnv,
      reuseExistingServer: false,
    },
  ],
})
