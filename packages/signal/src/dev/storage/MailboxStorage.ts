import type { MailboxEntry } from '../DevMailbox'

/**
 * Interface for DevMailbox storage engines.
 */
export interface MailboxStorage {
  /** Retrieve all entries. */
  all(): Promise<MailboxEntry[]>
  /** Add a single entry. */
  push(entry: MailboxEntry): Promise<void>
  /** Trim entries to a specific count. */
  trim(max: number): Promise<void>
  /** Clear all entries. */
  clear(): Promise<void>
}
