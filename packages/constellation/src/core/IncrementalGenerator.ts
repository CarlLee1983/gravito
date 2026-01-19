import type { ChangeTracker, ShardManifest, SitemapChange, SitemapEntry } from '../types'
import { DiffCalculator } from './DiffCalculator'
import type { SitemapGenerator, SitemapGeneratorOptions } from './SitemapGenerator'
import { SitemapGenerator as SitemapGeneratorImpl } from './SitemapGenerator'
import { SitemapParser } from './SitemapParser'
import { SitemapStream } from './SitemapStream'

/**
 * Options for configuring the `IncrementalGenerator`.
 */
export interface IncrementalGeneratorOptions extends SitemapGeneratorOptions {
  changeTracker: ChangeTracker
  diffCalculator?: DiffCalculator
  autoTrack?: boolean
}

/**
 * IncrementalGenerator optimizes sitemap updates by processing only changed URLs.
 */
export class IncrementalGenerator {
  private options: IncrementalGeneratorOptions
  private changeTracker: ChangeTracker
  private diffCalculator: DiffCalculator
  private generator: SitemapGenerator

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

  async generateFull(): Promise<void> {
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

  async generateIncremental(since?: Date): Promise<void> {
    const changes = await this.changeTracker.getChanges(since)
    if (changes.length === 0) {
      return
    }

    const manifest = await this.loadManifest()
    if (!manifest) {
      await this.generateFull()
      return
    }

    const changeRatio = changes.length / manifest.shards.reduce((acc, s) => acc + s.count, 0)
    if (changeRatio > 0.3) {
      await this.generateFull()
      return
    }

    const affectedShards = this.getAffectedShards(manifest, changes)
    if (affectedShards.size / manifest.shards.length > 0.5) {
      await this.generateFull()
      return
    }

    await this.updateShards(manifest, affectedShards)
  }

  private normalizeUrl(url: string): string {
    if (url.startsWith('http')) {
      return url
    }
    const { baseUrl } = this.options
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    const normalizedPath = url.startsWith('/') ? url : `/${url}`
    return normalizedBase + normalizedPath
  }

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

  private async updateShards(
    manifest: ShardManifest,
    affectedShards: Map<string, SitemapChange[]>
  ): Promise<void> {
    for (const [filename, shardChanges] of affectedShards) {
      const xml = await this.options.storage.read(filename)
      if (!xml) {
        continue
      }

      const entries = SitemapParser.parse(xml)
      const updatedEntries = this.applyChanges(entries, shardChanges)

      const stream = new SitemapStream({
        baseUrl: this.options.baseUrl,
        pretty: this.options.pretty,
      })
      stream.addAll(updatedEntries)

      const newXml = stream.toXML()
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

  private async toArray<T>(iterable: AsyncIterable<T>): Promise<T[]> {
    const array: T[] = []
    for await (const item of iterable) {
      array.push(item)
    }
    return array
  }
}
