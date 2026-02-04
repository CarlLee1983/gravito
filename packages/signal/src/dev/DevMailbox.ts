import { randomUUID } from 'node:crypto'
import type { Message } from '../types'
import type { MailboxStorage } from './storage/MailboxStorage'
import { MemoryMailboxStorage } from './storage/MemoryMailboxStorage'

/**
 * Entry structure for messages stored in DevMailbox.
 */
export interface MailboxEntry {
  /** Unique identifier for the entry. */
  id: string
  /** The email envelope metadata. */
  envelope: any
  /** The rendered HTML content. */
  html: string
  /** Optional plain text content. */
  text?: string
  /** Timestamp when the message was captured. */
  sentAt: Date
}

/**
 * Capture and store emails during development for preview and testing.
 *
 * Supports different storage engines (Memory, FileSystem) and implements
 * capacity limits via a Ring Buffer strategy.
 *
 * @example
 * ```typescript
 * // Default memory mailbox
 * const mailbox = new DevMailbox()
 *
 * // Persistent file mailbox
 * const storage = new FileMailboxStorage('./storage/mail')
 * const persistentMailbox = new DevMailbox(100, storage)
 * ```
 *
 * @since 3.0.0
 * @public
 */
export class DevMailbox {
  private storage: MailboxStorage
  private _maxEntries = 50

  /**
   * Creates an instance of DevMailbox.
   *
   * @param maxEntries - Maximum number of emails to store (default: 50)
   * @param storage - Optional custom storage engine (defaults to Memory)
   */
  constructor(maxEntries?: number, storage?: MailboxStorage) {
    if (maxEntries !== undefined) {
      this._maxEntries = maxEntries
    }
    this.storage = storage ?? new MemoryMailboxStorage()
  }

  /**
   * Adds a new message to the mailbox.
   *
   * If the mailbox exceeds the maximum capacity, the oldest messages are removed.
   */
  async add(message: Message): Promise<MailboxEntry> {
    const entry: MailboxEntry = {
      id: randomUUID(),
      envelope: {
        from: message.from,
        to: message.to,
        ...(message.cc ? { cc: message.cc } : {}),
        ...(message.bcc ? { bcc: message.bcc } : {}),
        ...(message.replyTo ? { replyTo: message.replyTo } : {}),
        subject: message.subject,
        ...(message.priority ? { priority: message.priority } : {}),
        ...(message.attachments ? { attachments: message.attachments } : {}),
      },
      html: message.html,
      ...(message.text ? { text: message.text } : {}),
      sentAt: new Date(),
    }

    await this.storage.push(entry)
    await this.storage.trim(this._maxEntries)

    return entry
  }

  /**
   * Sets the maximum number of emails to store.
   *
   * If the current mailbox exceeds the new capacity, the oldest messages are removed.
   */
  async setMaxEntries(count: number): Promise<void> {
    this._maxEntries = count
    await this.storage.trim(this._maxEntries)
  }

  /**
   * Returns the maximum capacity of the mailbox.
   */
  get maxEntries(): number {
    return this._maxEntries
  }

  /**
   * Lists all messages in the mailbox.
   */
  async list(): Promise<MailboxEntry[]> {
    return await this.storage.all()
  }

  /**
   * Retrieves a specific message by ID.
   */
  async get(id: string): Promise<MailboxEntry | undefined> {
    const entries = await this.storage.all()
    return entries.find((e) => e.id === id)
  }

  /**
   * Deletes a specific message by ID.
   */
  async delete(id: string): Promise<boolean> {
    const entries = await this.storage.all()
    const index = entries.findIndex((e) => e.id === id)
    if (index !== -1) {
      // Note: This logic assumes simple array rewrite for storage engines.
      // In more complex ones, we might need a dedicated delete method in MailboxStorage.
      // But for now, let's keep it simple.
      await this.clear()
      entries.splice(index, 1)
      for (const entry of entries.reverse()) {
        await this.storage.push(entry)
      }
      return true
    }
    return false
  }

  /**
   * Clears all messages from the mailbox.
   */
  async clear(): Promise<void> {
    await this.storage.clear()
  }
}
