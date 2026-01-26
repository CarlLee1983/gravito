import type { ChangeTracker, ShardManifest, SitemapChange, SitemapEntry } from '../types'
import { Mutex } from '../utils/Mutex'
import { DiffCalculator } from './DiffCalculator'
import type { SitemapGenerator, SitemapGeneratorOptions } from './SitemapGenerator'
import { SitemapGenerator as SitemapGeneratorImpl } from './SitemapGenerator'
import { SitemapParser } from './SitemapParser'
import { SitemapStream } from './SitemapStream'

/**
 * Options for configuring the `IncrementalGenerator`.
 *
 * @public
 * @since 3.0.0
 */
export interface IncrementalGeneratorOptions extends SitemapGeneratorOptions {
  /** The change tracker used to retrieve and record structural site changes. */
  changeTracker: ChangeTracker
  /** Optional diff calculator to identify added, updated, or removed entries. */
  diffCalculator?: DiffCalculator
  /** Whether to automatically track new entries discovered during full generation. @default true */
  autoTrack?: boolean
}

/**
 * IncrementalGenerator manages partial updates to the sitemap based on detected changes.
 *
 * It provides methods for performing both full and incremental generations,
 * using a `ChangeTracker` to determine which parts of the sitemap need updating.
 * This is particularly efficient for large sites where full regeneration is costly.
 *
 * @public
 * @since 3.0.0
 */
export class IncrementalGenerator {
  private options: IncrementalGeneratorOptions
  private changeTracker: ChangeTracker
  private diffCalculator: DiffCalculator
  private generator: SitemapGenerator
  private mutex = new Mutex()

  constructor(options: IncrementalGeneratorOptions) {
    this.options = {
      autoTrack: true,
      generateManifest: true,
      ...options,
    }
    this.changeTracker = this.options.changeTracker
    this.diffCalculator = this.options.diffCalculator || new DiffCalculator()
    this.generator = new SitemapGeneratorImpl(this.options)
  }

  /**
   * Performs a full sitemap generation and optionally records all entries in the change tracker.
   */
  async generateFull(): Promise<void> {
    return this.mutex.runExclusive(() => this.performFullGeneration())
  }

  /**
   * Performs an incremental sitemap update based on changes recorded since a specific time.
   *
   * If the number of changes exceeds a certain threshold (e.g., 30% of total URLs),
   * a full generation is triggered instead to ensure consistency.
   *
   * @param since - Optional start date for the incremental update.
   */
  async generateIncremental(since?: Date): Promise<void> {
    return this.mutex.runExclusive(() => this.performIncrementalGeneration(since))
  }

  /**
   * Internal implementation of full sitemap generation.
   */
  private async performFullGeneration(): Promise<void> {
    await this.generator.run()

    if (this.options.autoTrack) {
      const { providers } = this.options
      for (const provider of providers) {
        const entries = await provider.getEntries()
        const entriesArray = Array.isArray(entries) ? entries : await this.toArray(entries)

        for (const entry of entriesArray) {
          await this.changeTracker.track({
            type: 'add',
            url: entry.url,
            entry,
            timestamp: new Date(),
          })
        }
      }
    }
  }

  /**
   * Internal implementation of incremental sitemap generation.
   */
  private async performIncrementalGeneration(since?: Date): Promise<void> {
    const changes = await this.changeTracker.getChanges(since)
    if (changes.length === 0) {
      return
    }

    const manifest = await this.loadManifest()
    if (!manifest) {
      await this.performFullGeneration()
      return
    }

    const totalCount = manifest.shards.reduce((acc, s) => acc + s.count, 0)
    const changeRatio = totalCount > 0 ? changes.length / totalCount : 1

    // If more than 30% URLs changed, trigger full generation
    if (changeRatio > 0.3) {
      await this.performFullGeneration()
      return
    }

    const affectedShards = this.getAffectedShards(manifest, changes)
    // If more than 50% shards are affected, trigger full generation
    if (affectedShards.size / manifest.shards.length > 0.5) {
      await this.performFullGeneration()
      return
    }

    await this.updateShards(manifest, affectedShards)
  }

  /**
   * Normalizes a URL to an absolute URL using the base URL.
   */
  private normalizeUrl(url: string): string {
    if (url.startsWith('http')) {
      return url
    }
    const { baseUrl } = this.options
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    const normalizedPath = url.startsWith('/') ? url : `/${url}`
    return normalizedBase + normalizedPath
  }

  /**
   * Loads the sitemap shard manifest from storage.
   */
  private async loadManifest(): Promise<ShardManifest | null> {
    const filename =
      this.options.filename?.replace(/\.xml$/, '-manifest.json') || 'sitemap-manifest.json'
    const content = await this.options.storage.read(filename)
    if (!content) {
      return null
    }
    try {
      return JSON.parse(content)
    } catch {
      return null
    }
  }

  /**
   * Identifies which shards are affected by the given set of changes.
   */
  private getAffectedShards(
    manifest: ShardManifest,
    changes: SitemapChange[]
  ): Map<string, SitemapChange[]> {
    const affected = new Map<string, SitemapChange[]>()

    for (const change of changes) {
      const normalizedUrl = this.normalizeUrl(change.url)
      let shard = manifest.shards.find((s) => {
        return normalizedUrl >= s.from && normalizedUrl <= s.to
      })

      if (!shard) {
        shard = manifest.shards.find((s) => normalizedUrl <= s.to)
        if (!shard) {
          shard = manifest.shards[manifest.shards.length - 1]
        }
      }

      if (shard) {
        const shardChanges = affected.get(shard.filename) || []
        shardChanges.push(change)
        affected.set(shard.filename, shardChanges)
      }
    }

    return affected
  }

  /**
   * Updates the affected shards in storage.
   */
  private async updateShards(
    manifest: ShardManifest,
    affectedShards: Map<string, SitemapChange[]>
  ): Promise<void> {
    for (const [filename, shardChanges] of affectedShards) {
      const entries: SitemapEntry[] = []
      const stream = await this.options.storage.readStream?.(filename)

      if (stream) {
        for await (const entry of SitemapParser.parseStream(stream)) {
          entries.push(entry)
        }
      } else {
        const xml = await this.options.storage.read(filename)
        if (!xml) {
          continue
        }
        entries.push(...SitemapParser.parse(xml))
      }

      const updatedEntries = this.applyChanges(entries, shardChanges)

      const outStream = new SitemapStream({
        baseUrl: this.options.baseUrl,
        pretty: this.options.pretty,
      })
      outStream.addAll(updatedEntries)

      const newXml = outStream.toXML()
      await this.options.storage.write(filename, newXml)

      const shardInfo = manifest.shards.find((s) => s.filename === filename)
      if (shardInfo) {
        shardInfo.count = updatedEntries.length
        shardInfo.lastmod = new Date()
        shardInfo.from = this.normalizeUrl(updatedEntries[0].url)
        shardInfo.to = this.normalizeUrl(updatedEntries[updatedEntries.length - 1].url)
      }
    }

    const manifestFilename =
      this.options.filename?.replace(/\.xml$/, '-manifest.json') || 'sitemap-manifest.json'
    await this.options.storage.write(
      manifestFilename,
      JSON.stringify(manifest, null, this.options.pretty ? 2 : 0)
    )
  }

  /**
   * Applies changes to a set of sitemap entries and returns the updated, sorted list.
   */
  private applyChanges(entries: SitemapEntry[], changes: SitemapChange[]): SitemapEntry[] {
    const entryMap = new Map<string, SitemapEntry>()
    for (const entry of entries) {
      entryMap.set(this.normalizeUrl(entry.url), entry)
    }

    for (const change of changes) {
      const normalizedUrl = this.normalizeUrl(change.url)
      if (change.type === 'add' || change.type === 'update') {
        if (change.entry) {
          entryMap.set(normalizedUrl, {
            ...change.entry,
            url: normalizedUrl,
          })
        }
      } else if (change.type === 'remove') {
        entryMap.delete(normalizedUrl)
      }
    }

    return Array.from(entryMap.values()).sort((a, b) =>
      this.normalizeUrl(a.url).localeCompare(this.normalizeUrl(b.url))
    )
  }

  /**
   * Helper to convert an async iterable into an array.
   */
  private async toArray<T>(iterable: AsyncIterable<T>): Promise<T[]> {
    const array: T[] = []
    for await (const item of iterable) {
      array.push(item)
    }
    return array
  }
}
