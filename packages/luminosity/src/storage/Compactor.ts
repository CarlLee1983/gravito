import type { SitemapEntry } from '../interfaces'
import type { JsonlLogger } from './JsonlLogger'

/**
 * Compactor merges incremental log entries (WAL) into a clean, unified state.
 *
 * It replays all logged operations ('add', 'remove') starting from an initial
 * snapshot to produce a deduplicated and sorted list of sitemap entries.
 *
 * @public
 * @since 3.0.0
 */
export class Compactor {
  constructor(private logger: JsonlLogger) {}

  /**
   * Merge all log entries into a clean state
   * - Apply 'add' operations
   * - Apply 'remove' operations
   * - Deduplicate by URL (keep latest)
   * - Output sorted, clean entries
   */
  async compact(initialEntries: SitemapEntry[] = []): Promise<SitemapEntry[]> {
    const logs = await this.logger.readAll()
    const map = new Map<string, SitemapEntry>()

    // Load initial snapshot
    for (const entry of initialEntries) {
      map.set(entry.url, entry)
    }

    // Replay logs
    for (const log of logs) {
      if (log.op === 'add' && log.entry) {
        map.set(log.entry.url, log.entry)
      } else if (log.op === 'remove' && log.url) {
        map.delete(log.url)
      }
    }

    // Convert map to array
    return Array.from(map.values()).sort((a, b) => a.url.localeCompare(b.url))
  }

  /**
   * Repair corrupted log entries
   */
  async repairLogs(): Promise<number> {
    return this.logger.repairWAL()
  }
}
