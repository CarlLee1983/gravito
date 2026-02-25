import { join, parse } from 'node:path'
import {
  createHtmlRenderCallbacks,
  getEscapeHtml,
  getMarkdownAdapter,
  type MarkdownRenderCallbacks,
  type RuntimeMarkdownAdapter,
} from '@gravito/core'
import matter from 'gray-matter'
import type { ContentDriver } from './driver/ContentDriver'

/**
 * Represents a single content item (file).
 * @public
 */
export interface ContentItem {
  slug: string
  body: string // The HTML content
  excerpt?: string
  // biome-ignore lint/suspicious/noExplicitAny: Frontmatter can be anything
  meta: Record<string, any> // Frontmatter data
  raw: string // The raw markdown
}

/**
 * Configuration for a content collection.
 * @public
 */
export interface CollectionConfig {
  path: string // e.g., 'resources/content/docs'
}

/**
 * Manages fetching, parsing, and caching of filesystem-based content.
 *
 * 使用 RuntimeMarkdownAdapter 進行 Markdown 渲染，在 Bun 環境下
 * 自動使用原生 C++ 解析器（10-100x 更快），並保留 XSS 防護的
 * 自訂渲染回調。
 *
 * @public
 */
export class ContentManager {
  private collections = new Map<string, CollectionConfig>()
  // Simple memory cache: collection:locale:slug -> ContentItem
  private cache = new Map<string, ContentItem>()
  // In-memory search index: term -> Set<cacheKey>
  private searchIndex = new Map<string, Set<string>>()

  // Escape HTML helper
  private escapeHtml = getEscapeHtml()

  // RuntimeMarkdownAdapter（自動選擇 Bun 原生或 marked fallback）
  private readonly mdAdapter: RuntimeMarkdownAdapter = getMarkdownAdapter()
  // 完整的 HTML 渲染回調（含 XSS 防護覆寫）
  private readonly renderCallbacks: MarkdownRenderCallbacks = createHtmlRenderCallbacks({
    html: (rawHtml: string) => this.escapeHtml(rawHtml),
    link: (content: string, opts: { href: string; title?: string }) => {
      if (!opts.href || !this.isSafeUrl(opts.href)) {
        return content
      }
      const safeHref = this.escapeHtml(opts.href)
      const titleAttr = opts.title ? ` title="${this.escapeHtml(opts.title)}"` : ''
      return `<a href="${safeHref}"${titleAttr}>${content}</a>`
    },
  })

  /**
   * Clear all cached content.
   * Useful for hot reload during development.
   */
  clearCache(): void {
    this.cache.clear()
    this.searchIndex.clear()
  }

  /**
   * Invalidate a specific content item.
   * @param collection - The collection name.
   * @param slug - The file slug.
   * @param locale - The locale. Defaults to 'en'.
   */
  invalidate(collection: string, slug: string, locale = 'en'): void {
    const safeSlug = this.sanitizeSegment(slug)
    const safeLocale = this.sanitizeSegment(locale)

    if (safeSlug && safeLocale) {
      const cacheKey = `${collection}:${safeLocale}:${safeSlug}`
      this.cache.delete(cacheKey)
    }
  }

  getCollectionConfig(name: string): CollectionConfig | undefined {
    return this.collections.get(name)
  }

  /**
   * Create a new ContentManager instance.
   *
   * @param driver - The content driver to use.
   */
  constructor(private readonly driver: ContentDriver) {}

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
    const cachedItem = this.cache.get(cacheKey)
    if (cachedItem) {
      return cachedItem
    }

    // Determine path strategy
    // Strategy: {path}/{locale}/{slug}.md
    const filePath = join(config.path, safeLocale, `${safeSlug}.md`)

    try {
      const exists = await this.driver.exists(filePath)
      if (!exists) {
        return null
      }

      const fileContent = await this.driver.read(filePath)
      const { data, content, excerpt } = matter(fileContent)

      // 使用 RuntimeMarkdownAdapter.render() 搭配完整 HTML 回調（含 XSS 防護）
      const html = this.mdAdapter.render(content, this.renderCallbacks)

      const item: ContentItem = {
        slug,
        body: html,
        meta: data,
        raw: content,
        excerpt: excerpt,
      }

      this.cache.set(cacheKey, item)
      this.buildSearchIndex(cacheKey, item)
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

    const dirPath = join(config.path, safeLocale)

    try {
      const files = await this.driver.list(dirPath)
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

  /**
   * Search for content items across collections and locales.
   *
   * @param query - The search query.
   * @param options - Optional filters for collection and locale.
   * @returns An array of matching ContentItems.
   */
  search(query: string, options: { collection?: string; locale?: string } = {}): ContentItem[] {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
    if (terms.length === 0) {
      return []
    }

    const matches = new Set<string>()

    for (const term of terms) {
      const keys = this.searchIndex.get(term)
      if (keys) {
        for (const key of keys) {
          matches.add(key)
        }
      }
    }

    const results: ContentItem[] = []
    for (const key of matches) {
      const item = this.cache.get(key)
      if (!item) {
        continue
      }

      const [collection, locale] = key.split(':')

      if (options.collection && options.collection !== collection) {
        continue
      }
      if (options.locale && options.locale !== locale) {
        continue
      }

      results.push(item)
    }

    return results
  }

  private buildSearchIndex(cacheKey: string, item: ContentItem): void {
    const text =
      `${item.slug} ${item.meta.title || ''} ${item.raw} ${item.excerpt || ''}`.toLowerCase()
    const terms = text.split(/[^\w\d]+/).filter((t) => t.length > 2)

    for (const term of terms) {
      if (!this.searchIndex.has(term)) {
        this.searchIndex.set(term, new Set())
      }
      this.searchIndex.get(term)?.add(cacheKey)
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
