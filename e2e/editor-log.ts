import { readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const EDITOR_LOG = join(tmpdir(), 'source-locator-e2e-editor.log')

/** Arguments the fake editor last received, one per entry; empty when it never ran. */
export function readEditorArgs(): string[] {
  try {
    return readFileSync(EDITOR_LOG, 'utf8').split('\n').filter(Boolean)
  } catch {
    return []
  }
}

export function clearEditorLog(): void {
  rmSync(EDITOR_LOG, { force: true })
}
