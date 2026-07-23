import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sourceLocator } from '../dist/vite/index.js'

export default defineConfig({
  root: import.meta.dirname,
  plugins: [react(), sourceLocator({ theme: 'light' })],
  server: { port: 5177 },
})
