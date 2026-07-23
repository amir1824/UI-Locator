# Contributing

Thanks for helping improve `vite-plugin-source-locator`.

## Setup

```bash
git clone https://github.com/amir1824/UI-Locator.git
cd UI-Locator
npm install
```

Requires Node.js 18+.

## Scripts

| Command | What it does |
|---------|----------------|
| `npm run build` | Compile `src/` → `dist/` |
| `npm test` | Run Vitest once |
| `npm run test:watch` | Vitest watch mode |
| `npm run lint` | ESLint |
| `npm run playground` | Build plugin + open the React demo (`http://localhost:5177`) |
| `npm run clean` | Remove `dist/` |

`prepublishOnly` runs lint → build → test before every publish.

## Project layout

```
src/
  vite/      # Vite plugin, Babel plugin, editor open
  client/    # Browser overlay (badge, pick mode, tooltip)
  shared/    # Types, constants, theme
playground/  # Local React demo
tests/       # Mirrors src/ (client / vite / shared)
```

Keep tests next to the area they cover (`tests/client/…`, `tests/vite/…`, `tests/shared/…`).

## Workflow

1. Create a branch from `main`
2. Make the smallest change that solves the problem
3. Add or update a focused test when the logic is non-trivial
4. Run `npm run lint && npm run build && npm test`
5. Open a PR with a short “why” and how you verified it

For UI / pick-mode changes, also run `npm run playground` and click through:

- badge → hover → click opens the right file
- dialog open + pick does **not** dismiss the dialog
- Esc exits pick mode

## Coding notes

- Prefer the existing helpers in `src/shared` and `src/vite/editor-cli.ts` over new abstractions
- Client overlay stays in Shadow DOM; don’t leak styles into the host page
- Dev-only: plugin uses `apply: 'serve'` — don’t add production runtime
- Match existing naming and file style; keep diffs small

## Adding a new IDE

1. Extend `LocatorIde` and `IDE_ORDER` in `src/shared/index.ts`
2. Wire CLI / URL scheme resolution in `src/vite/editor-cli.ts` and `src/vite/editors.ts`
3. Prefer a [launch-editor supported name](https://github.com/vitejs/launch-editor#supported-editors)
4. Cover resolution in `tests/vite/`

## Reporting issues

Include:

- OS + editor (Cursor / VS Code / WebStorm)
- Vite + `@vitejs/plugin-react` versions
- Plugin version and relevant `sourceLocator({ … })` options
- Steps to reproduce (playground steps are ideal)

## License

By contributing, you agree your changes are released under the MIT license.
