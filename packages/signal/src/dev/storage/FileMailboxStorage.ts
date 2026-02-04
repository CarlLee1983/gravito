import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { MailboxEntry } from '../DevMailbox'
import type { MailboxStorage } from './MailboxStorage'

/**
 * File-based storage for DevMailbox (Persistence).
 * Stores emails as JSON in a specified directory.
 */
export class FileMailboxStorage implements MailboxStorage {
  private filePath: string

  constructor(storageDir: string) {
    this.filePath = join(storageDir, 'mailbox.json')
  }

  async all(): Promise<MailboxEntry[]> {
    try {
      const content = await readFile(this.filePath, 'utf-8')
      return JSON.parse(content)
    } catch (_e) {
      return []
    }
  }

  async push(entry: MailboxEntry): Promise<void> {
    const entries = await this.all()
    entries.unshift(entry)
    await this.save(entries)
  }

  async trim(max: number): Promise<void> {
    const entries = await this.all()
    if (entries.length > max) {
      await this.save(entries.slice(0, max))
    }
  }

  async clear(): Promise<void> {
    try {
      await unlink(this.filePath)
    } catch (_e) {
      // Ignore if file doesn't exist
    }
  }

  private async save(entries: MailboxEntry[]): Promise<void> {
    try {
      await mkdir(join(this.filePath, '..'), { recursive: true })
      await writeFile(this.filePath, JSON.stringify(entries, null, 2), 'utf-8')
    } catch (error) {
      console.error('[FileMailboxStorage] Failed to save mailbox:', error)
    }
  }
}
