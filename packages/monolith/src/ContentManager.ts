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

    const cacheKey = `${collectionName}:${locale}:${slug}`
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    // Determine path strategy
    // Strategy: {root}/{path}/{locale}/{slug}.md
    const filePath = join(this.rootDir, config.path, locale, `${slug}.md`)

    try {
      const exists = await stat(filePath)
        .then(() => true)
        .catch(() => false)
      if (!exists) {
        return null
      }

      const fileContent = await readFile(filePath, 'utf-8')
      const { data, content, exemption } = matter(fileContent)

      const html = await marked.parse(content)

      const item: ContentItem = {
        slug,
        body: html,
        meta: data,
        raw: content,
        excerpt: exemption,
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

    const dirPath = join(this.rootDir, config.path, locale)

    try {
      const files = await readdir(dirPath)
      const items: ContentItem[] = []

      for (const file of files) {
        if (!file.endsWith('.md')) {
          continue
        }
        const slug = parse(file).name
        const item = await this.find(collectionName, slug, locale)
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
}
