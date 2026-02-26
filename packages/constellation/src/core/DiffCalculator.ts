import type { SitemapChange, SitemapEntry } from '../types'

/**
 * Result of a sitemap difference calculation.
 *
 * @public
 * @since 3.0.0
 */
export interface DiffResult {
  /** Entries that are present in the new set but not in the old one. */
  added: SitemapEntry[]
  /** Entries that are present in both sets but have different metadata. */
  updated: SitemapEntry[]
  /** URLs that were present in the old set but are missing from the new one. */
  removed: string[] // URLs
}

/**
 * Options for configuring the `DiffCalculator`.
 *
 * @public
 * @since 3.0.0
 */
export interface DiffCalculatorOptions {
  /** Batch size for processing large datasets. @default 10000 */
  batchSize?: number
}

/**
 * DiffCalculator compares two sets of sitemap entries to identify changes.
 *
 * It is used for incremental sitemap generation, allowing the system to
 * update only the parts of the sitemap that have actually changed (added,
 * updated, or removed).
 *
 * @public
 * @since 3.0.0
 */
export class DiffCalculator {
  constructor(_options: DiffCalculatorOptions = {}) {}

  /**
   * Calculates the difference between two sets of sitemap entries.
   *
   * @param oldEntries - The previous set of sitemap entries.
   * @param newEntries - The current set of sitemap entries.
   * @returns A DiffResult containing added, updated, and removed entries.
   */
  calculate(oldEntries: SitemapEntry[], newEntries: SitemapEntry[]): DiffResult {
    const oldMap = new Map<string, SitemapEntry>()
    const newMap = new Map<string, SitemapEntry>()

    // Create mapping of old state
    for (const entry of oldEntries) {
      oldMap.set(entry.url, entry)
    }

    // Create mapping of new state
    for (const entry of newEntries) {
      newMap.set(entry.url, entry)
    }

    const added: SitemapEntry[] = []
    const updated: SitemapEntry[] = []
    const removed: string[] = []

    // Identify added and updated entries
    for (const [url, newEntry] of newMap) {
      const oldEntry = oldMap.get(url)
      if (!oldEntry) {
        added.push(newEntry)
      } else if (this.hasChanged(oldEntry, newEntry)) {
        updated.push(newEntry)
      }
    }

    // Identify removed entries
    for (const [url] of oldMap) {
      if (!newMap.has(url)) {
        removed.push(url)
      }
    }

    return { added, updated, removed }
  }

  /**
   * Batch calculates differences for large datasets using async iterables.
   *
   * @param oldEntries - An async iterable of the previous sitemap entries.
   * @param newEntries - An async iterable of the current sitemap entries.
   * @returns A promise resolving to the DiffResult.
   */
  async calculateBatch(
    oldEntries: AsyncIterable<SitemapEntry>,
    newEntries: AsyncIterable<SitemapEntry>
  ): Promise<DiffResult> {
    const oldMap = new Map<string, SitemapEntry>()
    const newMap = new Map<string, SitemapEntry>()

    // Read old state in batches
    for await (const entry of oldEntries) {
      oldMap.set(entry.url, entry)
    }

    // Read new state in batches
    for await (const entry of newEntries) {
      newMap.set(entry.url, entry)
    }

    return this.calculate(Array.from(oldMap.values()), Array.from(newMap.values()))
  }

  /**
   * Calculates differences based on a sequence of change records.
   *
   * @param baseEntries - The base set of sitemap entries.
   * @param changes - An array of change records to apply to the base set.
   * @returns A DiffResult comparing the base set with the applied changes.
   */
  calculateFromChanges(baseEntries: SitemapEntry[], changes: SitemapChange[]): DiffResult {
    const entryMap = new Map<string, SitemapEntry>()

    // Create mapping of base state
    for (const entry of baseEntries) {
      entryMap.set(entry.url, entry)
    }

    // Apply changes
    for (const change of changes) {
      if (change.type === 'add' && change.entry) {
        entryMap.set(change.url, change.entry)
      } else if (change.type === 'update' && change.entry) {
        entryMap.set(change.url, change.entry)
      } else if (change.type === 'remove') {
        entryMap.delete(change.url)
      }
    }

    // Calculate diff
    const newEntries = Array.from(entryMap.values())
    return this.calculate(baseEntries, newEntries)
  }

  /**
   * Checks if a sitemap entry has changed by comparing its key properties.
   *
   * @param oldEntry - The previous sitemap entry.
   * @param newEntry - The current sitemap entry.
   * @returns True if the entry has changed, false otherwise.
   */
  private hasChanged(oldEntry: SitemapEntry, newEntry: SitemapEntry): boolean {
    // Compare key fields
    if (oldEntry.lastmod !== newEntry.lastmod) {
      return true
    }
    if (oldEntry.changefreq !== newEntry.changefreq) {
      return true
    }
    if (oldEntry.priority !== newEntry.priority) {
      return true
    }

    // Compare alternates (simplified comparison)
    const oldAlternates = JSON.stringify(oldEntry.alternates || [])
    const newAlternates = JSON.stringify(newEntry.alternates || [])
    if (oldAlternates !== newAlternates) {
      return true
    }

    return false
  }
}
