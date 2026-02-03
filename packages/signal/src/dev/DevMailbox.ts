import { randomUUID } from 'node:crypto'
import type { Envelope, Message } from '../types'

/**
 * Represents a captured email in the development mailbox.
 *
 * @public
 */
export interface MailboxEntry {
  /** Unique identifier for the email */
  id: string
  /** Email envelope information (from, to, subject, etc.) */
  envelope: Envelope
  /** HTML content of the email */
  html: string
  /** Plain text content of the email (optional) */
  text?: string
  /** Timestamp when the email was captured */
  sentAt: Date
}

/**
 * In-memory mailbox for capturing emails during development.
 *
 * Stores up to 50 recent emails and provides methods to list,
 * retrieve, and delete captured messages.
 *
 * @example
 * ```typescript
 * const mailbox = new DevMailbox()
 * mailbox.add(message)
 * const emails = mailbox.list()
 * ```
 *
 * @since 3.0.0
 * @public
 */
export class DevMailbox {
  private entries: MailboxEntry[] = []
  private _maxEntries = 50

  /**
   * Creates an instance of DevMailbox.
   *
   * @param maxEntries - Maximum number of emails to store (default: 50)
   */
  constructor(maxEntries?: number) {
    if (maxEntries !== undefined) {
      this._maxEntries = maxEntries
    }
  }

  /**
   * Adds a new message to the mailbox.
   *
   * If the mailbox exceeds the maximum capacity, the oldest messages are removed.
   */
  add(message: Message): MailboxEntry {
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

    this.entries.unshift(entry)

    // Limit size
    if (this.entries.length > this._maxEntries) {
      this.entries = this.entries.slice(0, this._maxEntries)
    }

    return entry
  }

  /**
   * Sets the maximum number of emails to store.
   *
   * If the current mailbox exceeds the new capacity, the oldest messages are removed.
   */
  setMaxEntries(count: number): void {
    this._maxEntries = count
    if (this.entries.length > this._maxEntries) {
      this.entries = this.entries.slice(0, this._maxEntries)
    }
  }

  /**
   * Returns the maximum capacity of the mailbox.
   */
  get maxEntries(): number {
    return this._maxEntries
  }

  list(): MailboxEntry[] {
    return this.entries
  }

  get(id: string): MailboxEntry | undefined {
    return this.entries.find((e) => e.id === id)
  }

  delete(id: string): boolean {
    const index = this.entries.findIndex((e) => e.id === id)
    if (index !== -1) {
      this.entries.splice(index, 1)
      return true
    }
    return false
  }

  clear(): void {
    this.entries = []
  }
}
