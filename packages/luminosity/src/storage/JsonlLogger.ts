import type { SitemapEntry } from '../interfaces'
import type { StorageAdapter } from './adapter'
import { FileSystemAdapter } from './FileSystemAdapter'

/**
 * Represents a single operation in the incremental sitemap log.
 *
 * @public
 * @since 3.0.0
 */
export interface LogEntry {
  /** The operation type: 'add' (includes update) or 'remove'. */
  op: 'add' | 'remove'
  /** Epoch timestamp in milliseconds. */
  timestamp: number
  /** The sitemap entry data (required for 'add' operations). */
  entry?: SitemapEntry
  /** The target URL (required for 'remove' operations). */
  url?: string
}

/**
 * JsonlLogger implements a Write-Ahead Log (WAL) using newline-delimited JSON.
 *
 * It provides durable storage for incremental sitemap updates, allowing
 * for atomic appends and full log replays during compaction.
 *
 * @public
 * @since 3.0.0
 */
export class JsonlLogger {
  private adapter: StorageAdapter

  constructor(
    private logPath: string,
    adapter?: StorageAdapter
  ) {
    this.adapter = adapter || new FileSystemAdapter()
  }

  /**
   * Append a single operation to the log.
   *
   * @param entry - The operation to log.
   */
  async append(entry: LogEntry): Promise<void> {
    const line = `${JSON.stringify(entry)}\n`
    await this.adapter.append(this.logPath, line)
  }

  /**
   * Read all entries from the log.
   *
   * Parses the file line by line. Skips any lines that fail to parse as JSON.
   *
   * @returns A promise resolving to an array of log entries.
   */
  async readAll(): Promise<LogEntry[]> {
    if (!(await this.adapter.exists(this.logPath))) {
      return []
    }

    const content = await this.adapter.read(this.logPath)
    const lines = content.split('\n').filter((line) => line.trim().length > 0)

    return lines
      .map((line) => {
        try {
          return JSON.parse(line)
        } catch {
          return null // Skip corrupted lines
        }
      })
      .filter((x) => x !== null) as LogEntry[]
  }

  /**
   * Get the current size of the log file.
   *
   * @returns The size in bytes.
   */
  async getSize(): Promise<number> {
    return this.adapter.size(this.logPath)
  }

  /**
   * Delete the log file.
   */
  async delete(): Promise<void> {
    await this.adapter.delete(this.logPath)
  }

  /**
   * Filter out corrupted lines and rewrite the log file.
   *
   * Reads the entire file, filters out invalid JSON lines, and writes it back.
   * This is an atomic operation using a temporary file and rename.
   *
   * @returns A promise resolving to the number of corrupted lines removed.
   */
  async repairWAL(): Promise<number> {
    if (!(await this.adapter.exists(this.logPath))) {
      return 0
    }

    const content = await this.adapter.read(this.logPath)
    const lines = content.split('\n')
    const validLines: string[] = []
    let corruptedCount = 0

    for (const line of lines) {
      if (line.trim().length === 0) {
        continue
      }
      try {
        JSON.parse(line)
        validLines.push(line)
      } catch {
        corruptedCount++
      }
    }

    if (corruptedCount > 0) {
      const newContent = validLines.length > 0 ? `${validLines.join('\n')}\n` : ''
      const tempPath = `${this.logPath}.fixed`

      // Use write to create the fixed file (append might not be clean if we want full replace)
      // Actually repairWAL Logic: rewrite content.
      await this.adapter.write(tempPath, newContent)

      // Atomic rename
      await this.adapter.rename(tempPath, this.logPath)
    }

    return corruptedCount
  }
}
