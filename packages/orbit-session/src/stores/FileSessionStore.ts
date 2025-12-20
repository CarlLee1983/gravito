import { join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { unlink } from 'node:fs/promises'
import { BunFile } from 'bun'
import type { SessionId, SessionRecord, SessionStore } from '../types'

export class FileSessionStore implements SessionStore {
  constructor(private path: string) {
    mkdirSync(this.path, { recursive: true })
  }

  private getFilePath(id: string): string {
    // Basic sanitization
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '')
    return join(this.path, `${safeId}.json`)
  }

  async get(id: SessionId): Promise<SessionRecord | null> {
    const file = Bun.file(this.getFilePath(id))
    if (!(await file.exists())) {
      return null
    }
    try {
      const content = await file.text()
      return JSON.parse(content) as SessionRecord
    } catch {
      return null
    }
  }

  async set(id: SessionId, record: SessionRecord, ttlSeconds: number): Promise<void> {
    const file = Bun.file(this.getFilePath(id))
    await Bun.write(file, JSON.stringify(record))
  }

  async delete(id: SessionId): Promise<void> {
    try {
      await unlink(this.getFilePath(id))
    } catch {
      // Ignore if not found
    }
  }
}
