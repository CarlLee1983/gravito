import type { MailboxEntry } from '../DevMailbox'
import type { MailboxStorage } from './MailboxStorage'

/**
 * Memory-based storage for DevMailbox (Default).
 */
export class MemoryMailboxStorage implements MailboxStorage {
  private entries: MailboxEntry[] = []

  async all(): Promise<MailboxEntry[]> {
    return [...this.entries]
  }

  async push(entry: MailboxEntry): Promise<void> {
    this.entries.unshift(entry)
  }

  async trim(max: number): Promise<void> {
    if (this.entries.length > max) {
      this.entries = this.entries.slice(0, max)
    }
  }

  async clear(): Promise<void> {
    this.entries = []
  }

  async delete(id: string): Promise<boolean> {
    const index = this.entries.findIndex((e) => e.id === id)
    if (index !== -1) {
      this.entries.splice(index, 1)
      return true
    }
    return false
  }
}
