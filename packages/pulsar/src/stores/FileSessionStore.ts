import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { getRuntimeAdapter } from '@gravito/core'

const sharedDecoder = new TextDecoder()

import { PulsarErrorCodes } from '../errors/codes'
import { PulsarError } from '../errors/PulsarError'
import type { SessionId, SessionRecord, SessionStore } from '../types'

interface PersistedSessionFile {
  record: SessionRecord
  expiresAt: number
}

/**
 * File-based session store for development and small-scale production.
 *
 * Stores each session as a separate JSON file in the specified directory.
 * Provides transparent debugging (you can inspect session files directly) but
 * lacks automatic expiration and is slower than memory/Redis due to disk I/O.
 *
 * **Performance Characteristics:**
 * - ✅ Simple and transparent (plain JSON files you can inspect)
 * - ✅ No external dependencies or complex setup
 * - ✅ Good for debugging (can view session files directly)
 * - ⚠️  Slower than memory/Redis due to disk I/O on every operation
 * - ⚠️  No automatic expiration (manual cleanup needed)
 * - ❌ Not suitable for high-traffic sites (file system overhead)
 *
 * **Best For:** Development, debugging, small single-instance apps, learning environments
 *
 * @example
 * ```typescript
 * const store = new FileSessionStore('./storage/sessions')
 * await store.set('session-id', {
 *   data: { userId: '123' },
 *   createdAt: Date.now(),
 *   lastActivityAt: Date.now()
 * }, 3600)
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

  /**
   * Sanitize and validate session ID to prevent path traversal attacks.
   *
   * Only allows alphanumeric characters, underscores, and hyphens.
   * This prevents attackers from using session IDs like "../../../etc/passwd"
   * to access files outside the session directory.
   *
   * @param sessionId - The session ID to validate
   * @returns The sanitized session ID (same as input if valid)
   * @throws {Error} If session ID is empty after sanitization
   * @throws {Error} If session ID contains illegal characters
   * @private
   */
  private sanitizeSessionId(sessionId: string): string {
    const sanitized = sessionId.replace(/[^a-zA-Z0-9_-]/g, '')

    if (sanitized.length === 0) {
      throw new PulsarError(400, PulsarErrorCodes.INVALID_SESSION_ID, {
        message: 'Invalid session ID: no valid characters',
      })
    }

    if (sanitized !== sessionId) {
      throw new PulsarError(400, PulsarErrorCodes.INVALID_SESSION_ID, {
        message: 'Invalid session ID: contains illegal characters',
      })
    }

    return sanitized
  }

  private getFilePath(id: string): string {
    const safeId = this.sanitizeSessionId(id)
    return join(this.path, `${safeId}.json`)
  }

  private isPersistedSessionFile(value: unknown): value is PersistedSessionFile {
    return (
      !!value &&
      typeof value === 'object' &&
      'record' in value &&
      'expiresAt' in value &&
      typeof (value as PersistedSessionFile).expiresAt === 'number'
    )
  }

  async get(id: SessionId): Promise<SessionRecord | null> {
    const path = this.getFilePath(id)
    if (!(await this.runtime.exists(path))) {
      return null
    }
    try {
      const content = await this.runtime.readFile(path)
      const parsed = JSON.parse(sharedDecoder.decode(content)) as
        | SessionRecord
        | PersistedSessionFile

      if (this.isPersistedSessionFile(parsed)) {
        if (Date.now() >= parsed.expiresAt) {
          await this.delete(id)
          return null
        }
        return parsed.record
      }

      return parsed as SessionRecord
    } catch {
      return null
    }
  }

  async set(id: SessionId, record: SessionRecord, ttlSeconds: number): Promise<void> {
    const persisted: PersistedSessionFile = {
      record,
      expiresAt: Date.now() + ttlSeconds * 1000,
    }
    await this.runtime.writeFile(this.getFilePath(id), JSON.stringify(persisted))
  }

  async delete(id: SessionId): Promise<void> {
    await this.runtime.deleteFile(this.getFilePath(id))
  }
}
