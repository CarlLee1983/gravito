import { readdir, readFile, stat } from 'node:fs/promises'
import { join, parse } from 'node:path'
import matter from 'gray-matter'
import { marked } from 'marked'

export interface ContentItem {
  slug: string
  body: string // The HTML content
  excerpt?: string
  // biome-ignore lint/suspicious/noExplicitAny: Frontmatter can be anything
  meta: Record<string, any> // Frontmatter data
  raw: string // The raw markdown
}

export interface CollectionConfig {
  path: string // e.g., 'resources/content/docs'
}

export class ContentManager {
  private collections = new Map<string, CollectionConfig>()
  // Simple memory cache: collection:locale:slug -> ContentItem
  private cache = new Map<string, ContentItem>()
  private renderer = (() => {
    const renderer = new marked.Renderer()
    renderer.html = (html: string) => this.escapeHtml(html)
    renderer.link = (href: string | null, title: string | null, text: string) => {
      if (!href || !this.isSafeUrl(href)) {
        return text
      }
      const safeHref = this.escapeHtml(href)
      const titleAttr = title ? ` title="${this.escapeHtml(title)}"` : ''
      return `<a href="${safeHref}"${titleAttr}>${text}</a>`
    }
    return renderer
  })()

  /**
   * Create a new ContentManager instance.
   *
   * @param rootDir - The root directory of the application.
   */
  constructor(private rootDir: string) {}

  /**
   * Register a new content collection.
   *
   * @param name - The name of the collection.
   * @param config - The collection configuration.
   */
  defineCollection(name: string, config: CollectionConfig) {
    this.collections.set(name, config)
  }

  /**
   * Find a single content item.
   *
   * @param collectionName - The collection name (e.g. 'docs').
   * @param slug - The file slug (e.g. 'installation').
   * @param locale - The locale (e.g. 'en'). Defaults to 'en'.
   * @returns A promise resolving to the ContentItem or null if not found.
   * @throws {Error} If the collection is not defined.
   */
  async find(collectionName: string, slug: string, locale = 'en'): Promise<ContentItem | null> {
    const config = this.collections.get(collectionName)
    if (!config) {
      throw new Error(`Collection '${collectionName}' not defined`)
    }

    const safeSlug = this.sanitizeSegment(slug)
    const safeLocale = this.sanitizeSegment(locale)
    if (!safeSlug || !safeLocale) {
      return null
    }

    const cacheKey = `${collectionName}:${locale}:${slug}`
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    // Determine path strategy
    // Strategy: {root}/{path}/{locale}/{slug}.md
    const filePath = join(this.rootDir, config.path, safeLocale, `${safeSlug}.md`)

    try {
      const exists = await stat(filePath)
        .then(() => true)
        .catch(() => false)
      if (!exists) {
        return null
      }

      const fileContent = await readFile(filePath, 'utf-8')
      const { data, content, excerpt } = matter(fileContent)

      const html = await marked.parse(content, { renderer: this.renderer })

      const item: ContentItem = {
        slug,
        body: html,
        meta: data,
        raw: content,
        excerpt: excerpt,
      }

      this.cache.set(cacheKey, item)
      return item
    } catch (e) {
      console.error(`[Orbit-Content] Error reading file: ${filePath}`, e)
      return null
    }
  }

  /**
   * List all items in a collection for a locale.
   * Useful for generating sitemaps or index pages.
   *
   * @param collectionName - The collection name.
   * @param locale - The locale. Defaults to 'en'.
   * @returns A promise resolving to an array of ContentItems.
   * @throws {Error} If the collection is not defined.
   */
  async list(collectionName: string, locale = 'en'): Promise<ContentItem[]> {
    const config = this.collections.get(collectionName)
    if (!config) {
      throw new Error(`Collection '${collectionName}' not defined`)
    }

    const safeLocale = this.sanitizeSegment(locale)
    if (!safeLocale) {
      return []
    }

    const dirPath = join(this.rootDir, config.path, safeLocale)

    try {
      const files = await readdir(dirPath)
      const items: ContentItem[] = []

      for (const file of files) {
        if (!file.endsWith('.md')) {
          continue
        }
        const slug = parse(file).name
        const item = await this.find(collectionName, slug, safeLocale)
        if (item) {
          items.push(item)
        }
      }

      return items
    } catch (_e) {
      // Directory likely doesn't exist for this locale
      return []
    }
  }

  private sanitizeSegment(value: string): string | null {
    if (!value) {
      return null
    }
    if (value.includes('\0')) {
      return null
    }
    if (value.includes('/') || value.includes('\\')) {
      return null
    }
    if (value.includes('..')) {
      return null
    }
    return value
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  private isSafeUrl(href: string): boolean {
    const trimmed = href.trim()
    if (!trimmed) {
      return false
    }
    const lower = trimmed.toLowerCase()
    if (
      lower.startsWith('javascript:') ||
      lower.startsWith('vbscript:') ||
      lower.startsWith('data:')
    ) {
      return false
    }
    const schemeMatch = lower.match(/^[a-z][a-z0-9+.-]*:/)
    if (!schemeMatch) {
      return true
    }
    const scheme = schemeMatch[0]
    return scheme === 'http:' || scheme === 'https:' || scheme === 'mailto:'
  }
}
