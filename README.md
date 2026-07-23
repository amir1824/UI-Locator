# vite-plugin-source-locator

Dev-only tool for jumping from UI elements in the browser to source files in your IDE. Works as a drop-in Vite plugin for React apps.

## Project Structure

```
├── src/
│   ├── vite/      # Vite plugin, Babel plugin, editor integration
│   ├── client/    # Browser overlay (pick mode, tooltip, highlight)
│   └── shared/    # Types, constants, theme utilities
├── playground/    # Local React demo for pick mode + dialog shield
├── tests/         # Mirrors src/ layout
├── dist/          # Build output (published to npm)
└── .github/       # CI workflows
```

## Install

```bash
npm install -D vite-plugin-source-locator
```

You also need `@vitejs/plugin-react` (or another setup that runs the Babel plugin in dev).

## Playground

Local demo app (builds the plugin, then starts Vite on port `5177`):

```bash
npm run playground
```

Use the **Locator** badge to pick elements. Open the dialog and pick while it is open — outside-click should not close it.

## Usage

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sourceLocator } from 'vite-plugin-source-locator/vite'

export default defineConfig({
  plugins: [
    react(),
    sourceLocator(),
  ],
})
```

No `main.tsx` wiring required. The plugin auto-injects the client overlay in dev.

## Pick Mode

1. Click the badge (bottom-right): **Locator**
2. Hover elements — blue highlight + file paths in tooltip
3. Click to open the TSX source file in your IDE
4. **Esc** — cancel pick mode

| Shortcut | Action |
|----------|--------|
| Click | Open TSX source |
| Esc | Cancel pick |

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
| `'light'` | White background + blue accent (also used when `theme` is omitted) |
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
  theme: 'blue',
})
```

## IDE Setup

On **macOS**, Cursor / VS Code open via `cursor://file/…` / `vscode://file/…` (Launch Services → existing window, no second Dock icon). WebStorm and non-macOS platforms spawn the editor CLI with `-r -g` (or WebStorm `--line` / `--column`).

Editor discovery still uses [`launch-editor`'s guess helper](https://github.com/vitejs/launch-editor) as a last resort.

### Auto detection (default)

By default, `ides` includes `'auto'` as the first entry. In `auto` mode, the plugin picks an editor in this order:

1. `LAUNCH_EDITOR` environment variable (explicit override)
2. IDE-injected env (Cursor markers / VS Code NLS paths — not bare `VSCODE_PID`, which forks also set)
3. The IDE that launched this Vite process (parent-process walk)
4. Machine-wide detection via [`launch-editor` guess](https://github.com/vitejs/launch-editor) (running GUI editors / `VISUAL` — terminal editors like `vim` are ignored)

The plugin resolves known app-bundle CLI paths automatically (e.g. VS Code on macOS). If detection still fails, install the editor shell command or set `LAUNCH_EDITOR` to the full CLI path.

```typescript
// auto-detect open IDE (default)
sourceLocator()

// VS Code only
sourceLocator({ ides: ['vscode'] })
```

The `ides` option controls which editors the server may open. The browser client always sends `ide=auto`; the server resolves that via `resolveIde` against your `ides` list.

### Explicit editor

When not using `auto`, the plugin resolves common install paths first, then falls back to the CLI name on `PATH`:

| IDE | CLI command |
|-----|-------------|
| Cursor | `cursor` |
| VS Code | `code` |
| WebStorm | `webstorm` |

If opening fails with `ENOENT`, install the shell command in your editor (VS Code: **Shell Command: Install 'code' command in PATH**) or set a full path:

```
LAUNCH_EDITOR=/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code
```

## Adding a New IDE

1. Extend `LocatorIde` and `IDE_ORDER` in `src/shared/index.ts`
2. Use a [launch-editor supported editor name](https://github.com/vitejs/launch-editor#supported-editors) as the new `LocatorIde` value

## Limitations

- Dev only — no production impact
- JSX/TSX only for `data-source` injection

## License

MIT
