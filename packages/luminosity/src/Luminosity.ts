import { createWriteStream, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { SitemapEntry } from './interfaces'
import { RobotsTxtBuilder } from './robots/RobotsTxtBuilder'
import { SitemapIndexBuilder } from './xml/SitemapIndexBuilder'
import { XmlStreamBuilder } from './xml/XmlStreamBuilder'

export interface LuminosityOptions {
  /** Output directory path (default: ./public) */
  path?: string
  /** Base URL for sitemaps (e.g., https://example.com) to be used in index and entries */
  hostname?: string
  /** Max URLs per sitemap file (default: 50000) */
  maxEntriesPerFile?: number
  /** Enable gzip compression (TODO) */
  gzip?: boolean
}

/**
 * The main entry point for the Luminosity Sitemap Engine.
 * Provides a high-level, streaming API for generating sitemaps.
 */
export class Luminosity {
  private config: LuminosityOptions

  constructor(config: LuminosityOptions = {}) {
    this.config = config
  }

  /**
   * Generates sitemaps based on the provided entries using a highly efficient stream.
   *
   * @param entries - An array of entries, an async generator, or a resolver function.
   */
  async generate(
    entries: SitemapEntry[] | AsyncIterable<SitemapEntry> | (() => Promise<SitemapEntry[]>)
  ): Promise<void> {
    const outDir = this.config.path || './public'
    const hostname = this.config.hostname || 'http://localhost'
    const limit = this.config.maxEntriesPerFile || 50000

    // Ensure output dir exists
    mkdirSync(outDir, { recursive: true })

    const builder = new XmlStreamBuilder({ baseUrl: hostname })

    // Stream State
    let count = 0
    let fileIndex = 1
    let currentStream: any = null // fs.WriteStream
    const sitemapFiles: string[] = []

    const closeCurrentFile = async () => {
      if (currentStream) {
        await new Promise<void>((resolve, reject) => {
          currentStream.once('error', reject)
          currentStream.end(builder.end(), () => resolve())
        })
        currentStream = null
      }
    }

    const openNextFile = () => {
      const filename = `sitemap-${fileIndex}.xml`
      sitemapFiles.push(filename)
      currentStream = createWriteStream(join(outDir, filename))
      currentStream.write(builder.start())
      fileIndex++
    }

    // Resolve Iterator
    let iterator: AsyncIterable<SitemapEntry> | Iterable<SitemapEntry>

    if (Array.isArray(entries)) {
      iterator = entries
    } else if (typeof entries === 'function') {
      const result = entries()
      if (result && 'then' in result) {
        iterator = await result
      } else {
        iterator = await result
      }
    } else {
      iterator = entries as AsyncIterable<SitemapEntry>
    }

    // Start Processing
    openNextFile()

    for await (const entry of iterator) {
      if (count > 0 && count % limit === 0) {
        await closeCurrentFile()
        openNextFile()
      }
      currentStream.write(builder.entry(entry))
      count++
    }

    await closeCurrentFile()

    // Always generate index for consistency
    const indexBuilder = new SitemapIndexBuilder({ branding: true })
    const indexXml = indexBuilder.buildFull(
      sitemapFiles.map((f) => ({
        url: `${hostname.replace(/\/$/, '')}/${f}`,
        lastmod: new Date(),
      }))
    )

    writeFileSync(join(outDir, 'sitemap-index.xml'), indexXml)

    console.log(`✅ Generated ${count} URLs across ${sitemapFiles.length} files in ${outDir}`)
  }

  /**
   * Create a Robots.txt builder.
   */
  robots(): RobotsTxtBuilder {
    return new RobotsTxtBuilder()
  }
}
