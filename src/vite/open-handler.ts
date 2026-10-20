import type { IncomingMessage, ServerResponse } from 'node:http'
import { existsSync } from 'node:fs'
import { DEFAULT_IDE } from '../shared/index.js'
import type { LocatorIde } from '../shared/index.js'
import { openInEditor } from './editors.js'
import {
  isAllowedRequest,
  isInsideAnyRoot,
  readQuery,
  resolveFilePath,
} from './open-endpoint.js'
import type { OpenQuery } from './open-endpoint.js'

export type OpenHandlerConfig = {
  root: string
  allowedRoots: string[]
  ides: LocatorIde[]
}

type Reply = { status: number; body: string }

const REPLY = {
  forbidden: { status: 403, body: 'forbidden' },
  invalidRequest: { status: 400, body: 'invalid request' },
  missingFile: { status: 400, body: 'missing file' },
  outsideProject: { status: 403, body: 'outside project' },
  fileNotFound: { status: 404, body: 'file not found' },
  ok: { status: 200, body: 'ok' },
  openFailed: { status: 500, body: 'failed to open editor' },
} as const satisfies Record<string, Reply>

function parseQuery(url: string, defaultIde: LocatorIde): OpenQuery | undefined {
  try {
    return readQuery(url, defaultIde)
  } catch {
    return undefined
  }
}

async function resolveReply(req: IncomingMessage, config: OpenHandlerConfig): Promise<Reply> {
  if (!isAllowedRequest(req)) return REPLY.forbidden

  const query = parseQuery(req.url ?? '', config.ides[0] ?? DEFAULT_IDE)
  if (!query) return REPLY.invalidRequest
  if (!query.file) return REPLY.missingFile

  const file = resolveFilePath(query.file, config.root, config.allowedRoots)
  if (!isInsideAnyRoot(file, config.allowedRoots)) return REPLY.outsideProject
  if (!existsSync(file)) return REPLY.fileNotFound

  try {
    await openInEditor({ file, line: query.line, col: query.col }, query.ide, config.ides)
    return REPLY.ok
  } catch {
    return REPLY.openFailed
  }
}

export function createOpenHandler(config: OpenHandlerConfig) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const reply = await resolveReply(req, config)
    res.writeHead(reply.status, { 'Content-Type': 'text/plain' })
    res.end(reply.body)
  }
}
