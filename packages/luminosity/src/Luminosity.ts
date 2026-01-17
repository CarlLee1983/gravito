import { createWriteStream, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createGzip } from 'node:zlib'
import type { SitemapEntry } from './interfaces'
import { RobotsTxtBuilder } from './robots/RobotsTxtBuilder'
import { SitemapIndexBuilder } from './xml/SitemapIndexBuilder'
import { XmlStreamBuilder } from './xml/XmlStreamBuilder'

/**
 * Options for configuring the `Luminosity` sitemap generator.
 *
 * @public
 * @since 3.0.0
 */
export interface LuminosityOptions {
  /** Output directory path. @default './public' */
  path?: string
  /** Base URL for sitemaps (e.g., 'https://example.com') to be used in index and entries. */
  hostname?: string
  /** Maximum number of URLs per sitemap file. @default 50000 */
  maxEntriesPerFile?: number
  /** Whether to enable gzip compression for sitemap files. @default false */
  gzip?: boolean
}

/**
 * Luminosity is the core sitemap generation engine for Gravito.
 *
 * It provides a high-level, streaming API for generating SEO-compliant
 * sitemaps. It automatically handles file sharding, gzip compression,
 * and sitemap index generation.
 *
 * @example
 * ```typescript
 * const engine = new Luminosity({
 *   hostname: 'https://example.com',
 *   path: './dist'
 * });
 * await engine.generate(myEntries);
 * ```
 *
 * @public
 * @since 3.0.0
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
    const useGzip = this.config.gzip === true

    // Ensure output dir exists
    mkdirSync(outDir, { recursive: true })

    const builder = new XmlStreamBuilder({ baseUrl: hostname })

    // Stream State
    let count = 0
    let fileIndex = 1
    let currentFileStream: any = null
    let currentGzip: any = null
    let currentWriter: any = null // The stream we write strings to
    const sitemapFiles: string[] = []

    const closeCurrentFile = async () => {
      if (currentWriter) {
        // Write footer
        currentWriter.write(builder.end())

        await new Promise<void>((resolve, reject) => {
          if (useGzip) {
            currentWriter.end() // End Gzip
            // Wait for file stream to finish
            currentFileStream.once('finish', resolve)
            currentFileStream.once('error', reject)
          } else {
            currentWriter.end(() => resolve())
            currentWriter.once('error', reject)
          }
        })

        currentWriter = null
        currentGzip = null
        currentFileStream = null
      }
    }

    const openNextFile = () => {
      const extension = useGzip ? 'xml.gz' : 'xml'
      const filename = `sitemap-${fileIndex}.${extension}`
      sitemapFiles.push(filename)

      const filePath = join(outDir, filename)
      currentFileStream = createWriteStream(filePath)

      if (useGzip) {
        currentGzip = createGzip()
        currentGzip.pipe(currentFileStream)
        currentWriter = currentGzip
      } else {
        currentWriter = currentFileStream
      }

      currentWriter.write(builder.start())
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
      currentWriter.write(builder.entry(entry))
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

    // Index is usually not gzipped by default but can be.
    // Standard: sitemap-index.xml pointing to .gz files
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
