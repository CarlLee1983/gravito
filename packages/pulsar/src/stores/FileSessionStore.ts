import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { getRuntimeAdapter } from '@gravito/core'
import type { SessionId, SessionRecord, SessionStore } from '../types'

/**
 * File-based session store for single-instance deployments.
 *
 * Stores sessions as JSON files in the specified directory.
 * Suitable for development and small-scale production use.
 *
 * @example
 * ```typescript
 * const store = new FileSessionStore('./storage/sessions')
 * await store.set('session-id', { userId: '123' }, 3600)
 * const session = await store.get('session-id')
 * ```
 *
 * @since 3.0.0
 * @public
 */
export class FileSessionStore implements SessionStore {
  private runtime = getRuntimeAdapter()

  constructor(private path: string) {
    mkdirSync(this.path, { recursive: true })
  }

  private getFilePath(id: string): string {
    // Basic sanitization
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '')
    return join(this.path, `${safeId}.json`)
  }

  async get(id: SessionId): Promise<SessionRecord | null> {
    const path = this.getFilePath(id)
    if (!(await this.runtime.exists(path))) {
      return null
    }
    try {
      const content = await this.runtime.readFile(path)
      return JSON.parse(new TextDecoder().decode(content)) as SessionRecord
    } catch {
      return null
    }
  }

  async set(id: SessionId, record: SessionRecord, _ttlSeconds: number): Promise<void> {
    await this.runtime.writeFile(this.getFilePath(id), JSON.stringify(record))
  }

  async delete(id: SessionId): Promise<void> {
    await this.runtime.deleteFile(this.getFilePath(id))
  }
}
