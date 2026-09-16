# vite-plugin-source-locator

Dev-only Vite plugin that resolves any rendered UI element back to its source and exposes that context to coding agents (or opens the file in your IDE). Drop-in for React apps.

**UI → structured source context → any agent** — not locked to a single editor.

## Project Structure

```
├── src/
│   ├── vite/      # Vite plugin, Babel plugin, editor integration
│   ├── client/    # Browser overlay (pick / context / overlay)
│   │   ├── pick/      # controller, actions, events, select-bus
│   │   ├── context/   # LocatorContext, path, snapshot, prompts
│   │   └── overlay/   # badge, tooltip, styles
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
4. Shift+Click to copy a compact AI prompt; Alt/Option+Shift+Click for expanded (path / styles / box). On Mac the key is **Option** (⌥); on Windows/Linux it is **Alt**.
5. **Esc** — cancel pick mode

| Shortcut | Action |
|----------|--------|
| Click | Open TSX source |
| Shift+Click | Copy compact AI context |
| Alt/Option+Shift+Click | Copy expanded AI context |
| Esc | Cancel pick |

### Dialog-safe picking

While pick mode is on, pointer events are stopped at the `window` capture phase so overlays from Radix, MUI, and similar libraries do not treat the pick click as an outside dismiss. You can open a modal, enable Locator, and jump to source without the dialog closing.

## Exports

| Subpath | Purpose |
|---------|---------|
| `vite-plugin-source-locator/vite` | Vite plugin + `sourceLocator.babel()` |
| `vite-plugin-source-locator/client` | Overlay init, `inspect` / `onSelect`, context helpers |
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

const locator = initSourceLocator({
  endpoint: '/__open-in-editor',
  attribute: 'data-source',
  theme: 'blue',
})

// Optional: hook selections for any agent / MCP adapter
locator?.onSelect((ctx, { action }) => {
  console.log(action, ctx.source.file, ctx.source.line)
})

// Optional: inspect a DOM node programmatically (compact by default)
const context = locator?.inspect(document.querySelector('button')!)

// Expanded context (path, styles, box) for richer agent prompts
const expanded = locator?.inspect(document.querySelector('button')!, {
  detail: 'expanded',
})
```

Helpers for building / copying context without the overlay:

```typescript
import {
  getElementContext,
  contextToPrompt,
  copyContextForAI,
} from 'vite-plugin-source-locator/client'

const ctx = getElementContext(el, {
  attribute: 'data-source',
  detail: 'expanded',
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
- Expanded CSS path stops at mount ids `root` / `app` (common React mounts); other app shells keep walking to `body`
- Expanded context does not include screenshots or React Fiber props

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, scripts, PR workflow, and how to add a new IDE.

## Changelog

### 1.5.0

- UI context SDK: resolve UI → structured source context for any agent
- Shift+Click compact prompt; Alt/Option+Shift+Click expanded (path / styles / box)
- Public `inspect` / `onSelect` API plus `getElementContext` / `contextToPrompt`
- Client layout: `pick/` · `context/` · `overlay/`
- OS-aware shortcut labels (Option on Mac, Alt on Windows/Linux)
- `onSelect('open')` fires only after a successful editor open

### 1.4.0

- Dialog-safe pick mode (capture-phase shield so modals stay open while picking)
- Local React playground (`npm run playground`)
- More reliable macOS / IDE CLI opening and parent-process detection

## License

MIT
