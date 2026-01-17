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

  async write(filename: string, content: string): Promise<void> {
    this.files.set(filename, content)
  }

  async read(filename: string): Promise<string | null> {
    return this.files.get(filename) || null
  }

  async exists(filename: string): Promise<boolean> {
    return this.files.has(filename)
  }

  getUrl(filename: string): string {
    // Ensure baseUrl doesn't end with slash and filename doesn't start with slash
    const base = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl
    const file = filename.startsWith('/') ? filename.slice(1) : filename
    return `${base}/${file}`
  }
}
