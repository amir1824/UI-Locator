import type { IncomingMessage } from 'node:http'
import { existsSync, realpathSync } from 'node:fs'
import { isAbsolute, parse, relative, resolve, sep } from 'node:path'
import type { LocatorIde } from '../shared/index.js'

const COORDINATE_RE = /^\d+$/

export type OpenQuery = {
  file: string | null
  line: string
  col: string
  ide: string
}

// Coordinates flow into CLI args / URL schemes for the editor launcher; keep them
// numeric so nothing but a line/column number ever reaches that surface.
function sanitizeCoordinate(value: string | null): string {
  return value && COORDINATE_RE.test(value) ? value : '1'
}

export function readQuery(url: string, defaultIde: LocatorIde): OpenQuery {
  const parsed = new URL(url, 'http://localhost')
  return {
    file: parsed.searchParams.get('file'),
    line: sanitizeCoordinate(parsed.searchParams.get('line')),
    col: sanitizeCoordinate(parsed.searchParams.get('col')),
    ide: parsed.searchParams.get('ide') ?? defaultIde,
  }
}

function isPathWithinRoot(resolved: string, root: string): boolean {
  const rel = relative(root, resolved)
  return rel !== '' && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel)
}

export function isInsideRoot(resolved: string, root: string): boolean {
  if (!isPathWithinRoot(resolved, root)) return false
  // Re-check against the resolved (symlink-free) paths so a symlink that lexically
  // sits inside the project but points elsewhere on disk can't be used to escape it.
  try {
    return isPathWithinRoot(realpathSync(resolved), realpathSync(root))
  } catch {
    // Nonexistent → let the caller 404. Exists but unresolvable → deny.
    return !existsSync(resolved)
  }
}

export function isInsideAnyRoot(resolved: string, roots: string[]): boolean {
  return roots.some((root) => isInsideRoot(resolved, root))
}

export function isAllowedRequest(req: IncomingMessage): boolean {
  // Fetch Metadata: only same-origin requests (or clients that don't send the
  // header at all) get past. Blocks cross-site, same-site (e.g. another app on
  // a different localhost port), and navigations with `none` (Slack/email links).
  // The locator client always sends same-origin fetch.
  const secFetchSite = req.headers['sec-fetch-site']
  if (secFetchSite && secFetchSite !== 'same-origin') return false

  const origin = req.headers.origin
  const host = req.headers.host
  if (!origin || !host) return true
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

// The client sends root-relative paths (`src/App.tsx`) or, for files outside the
// project root, absolute ones. Vite dev URLs (`/src/App.tsx`) look absolute on
// POSIX, so an absolute path is kept only when it is an existing file inside an
// allowed root (e.g. `/src/App.tsx` in a container with `WORKDIR /src`); otherwise
// it is retried root-relative. Checking the roots before existence keeps the
// endpoint from revealing whether arbitrary files exist elsewhere on disk.
export function resolveFilePath(file: string, root: string, allowedRoots: string[]): string {
  if (!isAbsolute(file)) return resolve(root, file)
  const absolute = resolve(file)
  if (isInsideAnyRoot(absolute, allowedRoots) && existsSync(absolute)) return absolute
  // Drop the filesystem root (`/` or a drive like `C:\\`) so the retry always lands
  // under `root`; keeping a drive-letter path absolute would bypass the check above.
  return resolve(root, absolute.slice(parse(absolute).root.length))
}
