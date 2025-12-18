import { existsSync, mkdirSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { SitemapEntry } from '../../interfaces'
import { Compactor } from '../../storage/Compactor'
import { JsonlLogger } from '../../storage/JsonlLogger'
import type { SeoConfig } from '../../types'
import type { SeoStrategy } from '../interfaces'
import { DynamicStrategy } from './DynamicStrategy'

export class IncrementalStrategy implements SeoStrategy {
  private logger: JsonlLogger
  private compactor: Compactor
  private dynamic: DynamicStrategy
  private snapshotPath: string

  private compactTimer: Timer | null = null
  private compactInterval: number | undefined

  constructor(config: SeoConfig) {
    if (!config.incremental) {
      throw new Error('Config missing "incremental" settings for IncrementalStrategy')
    }

    const logDir = config.incremental.logDir
    // Ensure logDir exists synchronous is safer for init phase path construction
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true })
    }

    this.logger = new JsonlLogger(join(logDir, 'sitemap.ops.jsonl'))
    this.snapshotPath = join(logDir, 'sitemap.snapshot.json')
    this.compactor = new Compactor(this.logger)
    this.dynamic = new DynamicStrategy(config)
    this.compactInterval = config.incremental.compactInterval
  }

  async init(): Promise<void> {
    // Check if snapshot exists
    if (!existsSync(this.snapshotPath)) {
      console.log('[GravitoSeo] No snapshot found. Initializing from resolvers...')
      // Initial Population from Resolvers
      const entries = await this.dynamic.getEntries()
      await this.saveSnapshot(entries)
    }

    this.startAutoCompact()
  }

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

  async add(entry: SitemapEntry): Promise<void> {
    await this.logger.append({
      op: 'add',
      timestamp: Date.now(),
      entry,
    })
  }

  async remove(url: string): Promise<void> {
    await this.logger.append({
      op: 'remove',
      timestamp: Date.now(),
      url,
    })
  }

  /**
   * Force compaction: Merge logs into snapshot and clear logs
   */
  async compact(): Promise<void> {
    const snapshot = await this.loadSnapshot()
    const merged = await this.compactor.compact(snapshot)

    await this.saveSnapshot(merged)
    await this.logger.delete()

    console.log(`[GravitoSeo] Compacted ${merged.length} entries.`)
  }

  private async loadSnapshot(): Promise<SitemapEntry[]> {
    if (!existsSync(this.snapshotPath)) {
      return []
    }
    const data = await readFile(this.snapshotPath, 'utf-8')
    try {
      return JSON.parse(data)
    } catch {
      return []
    }
  }

  private async saveSnapshot(entries: SitemapEntry[]): Promise<void> {
    await writeFile(this.snapshotPath, JSON.stringify(entries), 'utf-8')
  }
}
