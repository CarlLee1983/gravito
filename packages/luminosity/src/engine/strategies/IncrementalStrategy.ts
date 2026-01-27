import { join } from 'node:path'
import type { SitemapEntry } from '../../interfaces'
import type { StorageAdapter } from '../../storage/adapter'
import { Compactor } from '../../storage/Compactor'
import { FileSystemAdapter } from '../../storage/FileSystemAdapter'
import { JsonlLogger } from '../../storage/JsonlLogger'
import type { SeoConfig } from '../../types'
import type { SeoStrategy } from '../interfaces'
import { DynamicStrategy } from './DynamicStrategy'

/**
 * IncrementalStrategy manages sitemap updates using a Write-Ahead Log (WAL).
 *
 * It stores an initial snapshot of all sitemap entries and appends any
 * subsequent changes (additions or removals) to a persistent log file (.jsonl).
 * When retrieving entries, it replays the log onto the snapshot to provide
 * the current state. It also handles automatic log compaction to keep the
 * system efficient.
 *
 * @public
 * @since 3.0.0
 */
export class IncrementalStrategy implements SeoStrategy {
  private logger: JsonlLogger
  private compactor: Compactor
  private dynamic: DynamicStrategy
  private snapshotPath: string
  private adapter: StorageAdapter

  private compactTimer: ReturnType<typeof setInterval> | null = null
  private compactInterval: number | undefined

  constructor(config: SeoConfig) {
    if (!config.incremental) {
      throw new Error('Config missing "incremental" settings for IncrementalStrategy')
    }

    const logDir = config.incremental.logDir
    this.adapter = config.incremental.storage || new FileSystemAdapter()

    // Ensure logDir exists if using FS adapter
    // Note: S3 adapters might not need directory creation
    this.adapter.ensureDir(logDir).catch(() => {})

    this.logger = new JsonlLogger(join(logDir, 'sitemap.ops.jsonl'), this.adapter)
    this.snapshotPath = join(logDir, 'sitemap.snapshot.json')
    this.compactor = new Compactor(this.logger)
    this.dynamic = new DynamicStrategy(config)
    this.compactInterval = config.incremental.compactInterval
  }

  /**
   * Initializes the strategy.
   *
   * Checks for an existing snapshot. If none is found, it performs an initial
   * population from the configured resolvers. Also starts the auto-compaction timer.
   *
   * @returns A promise that resolves when initialization is complete.
   * @throws {Error} If filesystem operations fail.
   */
  async init(): Promise<void> {
    // Check if snapshot exists
    if (!(await this.adapter.exists(this.snapshotPath))) {
      console.log('[GravitoSeo] No snapshot found. Initializing from resolvers...')
      // Initial Population from Resolvers
      const entries = await this.dynamic.getEntries()
      await this.saveSnapshot(entries)
    }

    this.startAutoCompact()
  }

  /**
   * Shuts down the strategy.
   *
   * Stops the auto-compaction timer to allow the process to exit cleanly.
   */
  async shutdown(): Promise<void> {
    this.stopAutoCompact()
  }

  private startAutoCompact() {
    if (this.compactInterval && this.compactInterval > 0 && !this.compactTimer) {
      console.log(`[GravitoSeo] Starting auto-compaction (interval: ${this.compactInterval}ms)`)
      this.compactTimer = setInterval(() => {
        this.compact().catch((err) => {
          console.error('[GravitoSeo] Auto-compaction failed:', err)
        })
      }, this.compactInterval)
    }
  }

  private stopAutoCompact() {
    if (this.compactTimer) {
      clearInterval(this.compactTimer)
      this.compactTimer = null
      console.log('[GravitoSeo] Stopped auto-compaction')
    }
  }

  /**
   * Retrieves the current sitemap entries.
   *
   * Loads the latest snapshot and merges it with any pending operations
   * from the WAL (Write-Ahead Log) in memory.
   *
   * @returns A promise that resolves to the merged array of sitemap entries.
   * @throws {Error} If reading or parsing files fails.
   */
  async getEntries(): Promise<SitemapEntry[]> {
    // 1. Load Snapshot
    const snapshot = await this.loadSnapshot()

    // 2. Apply Logs (In Memory) via Compactor
    // This merges the snapshot with pending logs
    const current = await this.compactor.compact(snapshot)

    // Optimisation: If logs are huge, trigger async compact/flush
    // For now, let's keep it simple: read-time merge is fast enough for LSM if logs are small.
    // If we want "pure" LSM speed, we serve the snapshot + logs.
    // Here we return the merged result.

    return current
  }

  /**
   * Appends a new entry to the Write-Ahead Log (WAL).
   *
   * @param entry - The sitemap entry to add.
   * @throws {Error} If writing to the log fails.
   */
  async add(entry: SitemapEntry): Promise<void> {
    await this.logger.append({
      op: 'add',
      timestamp: Date.now(),
      entry,
    })
  }

  /**
   * Appends a removal operation to the Write-Ahead Log (WAL).
   *
   * @param url - The URL of the entry to remove.
   * @throws {Error} If writing to the log fails.
   */
  async remove(url: string): Promise<void> {
    await this.logger.append({
      op: 'remove',
      timestamp: Date.now(),
      url,
    })
  }

  /**
   * Force compaction: Merge logs into snapshot and clear logs.
   *
   * This operation makes all pending changes permanent in the snapshot file
   * and truncates the WAL.
   *
   * @throws {Error} If filesystem operations fail.
   */
  async compact(): Promise<void> {
    const snapshot = await this.loadSnapshot()
    const merged = await this.compactor.compact(snapshot)

    await this.saveSnapshot(merged)
    await this.logger.delete()

    console.log(`[GravitoSeo] Compacted ${merged.length} entries.`)
  }

  private async loadSnapshot(): Promise<SitemapEntry[]> {
    if (!(await this.adapter.exists(this.snapshotPath))) {
      return []
    }
    const data = await this.adapter.read(this.snapshotPath)
    try {
      return JSON.parse(data)
    } catch {
      return []
    }
  }

  private async saveSnapshot(entries: SitemapEntry[]): Promise<void> {
    await this.adapter.write(this.snapshotPath, JSON.stringify(entries))
  }
}
