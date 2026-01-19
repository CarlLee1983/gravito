import { createReadStream } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { SitemapStorage } from '../types'

function sanitizeFilename(filename: string): string {
  if (!filename) {
    throw new Error('Invalid sitemap filename.')
  }
  if (filename.includes('\0')) {
    throw new Error('Invalid sitemap filename.')
  }
  if (filename.includes('/') || filename.includes('\\')) {
    throw new Error('Invalid sitemap filename.')
  }
  if (filename.includes('..')) {
    throw new Error('Invalid sitemap filename.')
  }
  return filename
}

/**
 * DiskSitemapStorage persists sitemap files to the local file system.
 *
 * It is the default storage backend for single-server Gravito deployments.
 * It automatically handles directory creation and ensures filenames are sanitized
 * to prevent path traversal attacks.
 *
 * @example
 * ```typescript
 * const storage = new DiskSitemapStorage('./public/sitemaps', 'https://example.com/sitemaps');
 * await storage.write('sitemap.xml', '...');
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class DiskSitemapStorage implements SitemapStorage {
  constructor(
    private outDir: string,
    private baseUrl: string
  ) {}

  async write(filename: string, content: string): Promise<void> {
    const safeName = sanitizeFilename(filename)
    await fs.mkdir(this.outDir, { recursive: true })
    await fs.writeFile(path.join(this.outDir, safeName), content)
  }

  async read(filename: string): Promise<string | null> {
    try {
      const safeName = sanitizeFilename(filename)
      return await fs.readFile(path.join(this.outDir, safeName), 'utf-8')
    } catch {
      return null
    }
  }

  async readStream(filename: string): Promise<AsyncIterable<string> | null> {
    try {
      const safeName = sanitizeFilename(filename)
      const fullPath = path.join(this.outDir, safeName)
      await fs.access(fullPath)

      const stream = createReadStream(fullPath, { encoding: 'utf-8' })
      return stream as any as AsyncIterable<string>
    } catch {
      return null
    }
  }

  async exists(filename: string): Promise<boolean> {
    try {
      const safeName = sanitizeFilename(filename)
      await fs.access(path.join(this.outDir, safeName))
      return true
    } catch {
      return false
    }
  }

  getUrl(filename: string): string {
    const safeName = sanitizeFilename(filename)
    const base = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl
    const file = safeName.startsWith('/') ? safeName.slice(1) : safeName
    return `${base}/${file}`
  }
}
