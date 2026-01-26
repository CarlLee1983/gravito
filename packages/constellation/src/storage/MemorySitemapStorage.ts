import type { SitemapStorage } from '../types'

/**
 * MemorySitemapStorage is a non-persistent, in-memory storage backend for sitemaps.
 *
 * It is primarily used for testing or for applications where sitemaps are
 * generated on-the-fly and served directly from memory.
 *
 * @example
 * ```typescript
 * const storage = new MemorySitemapStorage('https://example.com');
 * await storage.write('sitemap.xml', '...');
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class MemorySitemapStorage implements SitemapStorage {
  private files = new Map<string, string>()

  constructor(private baseUrl: string) {}

  /**
   * Writes sitemap content to memory.
   *
   * @param filename - The name of the file to store.
   * @param content - The XML or JSON content.
   */
  async write(filename: string, content: string): Promise<void> {
    this.files.set(filename, content)
  }

  /**
   * Reads sitemap content from memory.
   *
   * @param filename - The name of the file to read.
   * @returns A promise resolving to the file content as a string, or null if not found.
   */
  async read(filename: string): Promise<string | null> {
    return this.files.get(filename) || null
  }

  /**
   * Returns a readable stream for a sitemap file in memory.
   *
   * @param filename - The name of the file to stream.
   * @returns A promise resolving to an async iterable of file chunks, or null if not found.
   */
  async readStream(filename: string): Promise<AsyncIterable<string> | null> {
    const content = this.files.get(filename)
    if (content === undefined) {
      return null
    }

    return (async function* () {
      yield content
    })()
  }

  /**
   * Checks if a sitemap file exists in memory.
   *
   * @param filename - The name of the file to check.
   * @returns A promise resolving to true if the file exists, false otherwise.
   */
  async exists(filename: string): Promise<boolean> {
    return this.files.has(filename)
  }

  /**
   * Returns the full public URL for a sitemap file.
   *
   * @param filename - The name of the sitemap file.
   * @returns The public URL as a string.
   */
  getUrl(filename: string): string {
    // Ensure baseUrl doesn't end with slash and filename doesn't start with slash
    const base = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl
    const file = filename.startsWith('/') ? filename.slice(1) : filename
    return `${base}/${file}`
  }
}
