# vite-plugin-source-locator

Dev-only tool for jumping from UI elements in the browser to source files in your IDE. Works as a drop-in Vite plugin for React apps.

## Project Structure

```
├── src/
│   ├── vite/      # Vite plugin, Babel plugin, editor integration
│   ├── client/    # Browser overlay (pick mode, tooltip, highlight)
│   └── shared/    # Types, constants, theme utilities
├── tests/         # Mirrors src/ layout
├── dist/          # Build output (published to npm)
└── .github/       # CI workflows
```

## Install

```bash
npm install -D vite-plugin-source-locator
```

You also need `@vitejs/plugin-react` (or another setup that runs the Babel plugin in dev).

## Usage

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sourceLocator } from 'vite-plugin-source-locator/vite'

export default defineConfig(({ command }) => ({
  plugins: [
    react(command === 'serve' ? sourceLocator.babel() : undefined),
    sourceLocator(),
  ],
}))
```

No `main.tsx` wiring required. The plugin auto-injects the client overlay in dev.

## Pick Mode

1. Click the badge (bottom-right): **Source Locator (auto) — click to pick**
2. Hover elements — blue highlight + file paths in tooltip
3. Click to open source — cycles **TSX → CSS → TSX** when both exist
4. **Esc** — cancel pick mode
5. **Shift+L** — cycle IDE (session only, resets on refresh)

## Exports

| Subpath | Purpose |
|---------|---------|
| `vite-plugin-source-locator/vite` | Vite plugin + `sourceLocator.babel()` |
| `vite-plugin-source-locator/client` | Manual `initSourceLocator()` if auto-inject disabled |
| `vite-plugin-source-locator/shared` | Types, constants, parse/format utilities |

## Options

```typescript
sourceLocator({
  enabled: true,
  endpoint: '/__open-in-editor',
  attribute: 'data-source',
  ides: ['auto', 'cursor', 'vscode', 'webstorm'],
  theme: 'light',
})
```

### Theme

Control overlay colors (badge, tooltip, highlight). Presets or custom colors:

| Preset | Look |
|--------|------|
| `'default'` | Dark slate + cyan accent |
| `'light'` | White background + blue accent |
| `'dark'` | Black background + white/gray text |
| `'blue'` | Navy background + light blue accent |

```typescript
// preset
sourceLocator({ theme: 'light' })

// custom (merged over default)
import { initSourceLocator } from 'vite-plugin-source-locator/client'

initSourceLocator({
  endpoint: '/__open-in-editor',
  attribute: 'data-source',
  ides: ['auto', 'cursor', 'vscode', 'webstorm'],
  theme: {
    background: '#ffffff',
    text: '#000000',
    accent: '#2563eb',
  },
})
```

| Token | Used for |
|-------|----------|
| `background` | Badge & tooltip background |
| `text` | Tooltip text |
| `accent` | Borders, highlight, badge label |

## CSS Detection

When an element has styles from a project `.css` file (e.g. `index.css` custom classes like `.glass`), the tooltip shows:

```
components/DashboardStats.tsx
CSS: index.css
Click → TSX | next: CSS
```

Click cycles between opening the TSX and CSS file.

**Limitation:** Tailwind utility classes (`bg-slate-950`, etc.) are injected as inline `<style>` tags with no `.css` href — no CSS file is shown for those. CSS detection works for external `.css` stylesheets only. CSS opens at line 1 in v1.

## MFE Safety

- **Idempotent** — `window.__sourceLocator` guard: multiple bundles loading the locator mount only one overlay
- **Shadow DOM** — overlay styles isolated from host/MFE CSS
- **Virtual module** — client injected via `virtual:source-locator-client`, works from any consuming app

## Manual Init

```typescript
import { initSourceLocator } from 'vite-plugin-source-locator/client'

initSourceLocator({
  endpoint: '/__open-in-editor',
  attribute: 'data-source',
  ides: ['auto', 'cursor', 'vscode', 'webstorm'],
  theme: 'blue',
})
```

## IDE Setup

IDE opening works on **macOS, Windows, and Linux** via [`launch-editor`](https://github.com/vitejs/launch-editor).

### Auto detection (default)

By default, `ides` includes `'auto'` as the first entry. In `auto` mode, the plugin detects your open IDE:

1. `LAUNCH_EDITOR` / `REACT_EDITOR` environment variable
2. Running editor process (VS Code, Cursor, WebStorm, etc.)
3. `VISUAL` / `EDITOR` environment variable

No CLI on `PATH` is required if the editor is already running.

```typescript
// auto-detect open IDE (default)
sourceLocator()

// VS Code only
sourceLocator({ ides: ['vscode'] })

// auto + manual override with Shift+L (session only)
sourceLocator({ ides: ['auto', 'vscode'] })
```

The first entry in `ides` is the default. Shift+L cycles through the list in memory (resets on page refresh).

### Explicit editor

When not using `auto`, the editor CLI should be on your `PATH`:

| IDE | CLI command |
|-----|-------------|
| Cursor | `cursor` |
| VS Code | `code` |
| WebStorm | `webstorm` |

Override with environment variables:

- `LAUNCH_EDITOR=code`
- `REACT_EDITOR=code`

## Adding a New IDE

1. Extend `LocatorIde` and `IDE_ORDER` in `src/shared/index.ts`
2. Use a [launch-editor supported editor name](https://github.com/vitejs/launch-editor#supported-editors) as the new `LocatorIde` value

## Limitations

- Dev only — no production impact
- JSX/TSX only for `data-source` injection
- CSS line 1 only (no source-map line mapping yet)

## License

MIT
