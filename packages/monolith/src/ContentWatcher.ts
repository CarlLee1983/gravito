import { type FSWatcher, readdirSync, watch } from 'node:fs'
import { join } from 'node:path'
import type { ContentManager } from './ContentManager'

interface WatcherOptions {
  debounceMs?: number
}

export class ContentWatcher {
  private watchers: FSWatcher[] = []
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()

  constructor(
    private contentManager: ContentManager,
    private rootDir: string,
    private options: WatcherOptions = {}
  ) {}

  watch(collectionName: string): void {
    const config = this.contentManager.getCollectionConfig(collectionName)
    if (!config) {
      console.warn(`[ContentWatcher] Collection '${collectionName}' not found`)
      return
    }

    const watchPath = join(this.rootDir, config.path)

    // Watch the collection directory (recursive if supported)
    this.addWatcher(watchPath, collectionName)

    // On some platforms (like Linux), recursive watch is not supported.
    // We manually watch the immediate subdirectories (locales).
    try {
      const entries = readdirSync(watchPath, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          this.addWatcher(join(watchPath, entry.name), collectionName, entry.name)
        }
      }
    } catch (_e) {
      // Directory might not exist yet
    }
  }

  private addWatcher(watchPath: string, collection: string, localePrefix?: string) {
    try {
      const watcher = watch(watchPath, { recursive: true }, (_eventType, filename) => {
        if (!filename) {
          return
        }

        const key = `${collection}:${localePrefix || ''}:${filename}`
        if (this.debounceTimers.has(key)) {
          clearTimeout(this.debounceTimers.get(key))
        }

        this.debounceTimers.set(
          key,
          setTimeout(() => {
            this.handleFileChange(collection, filename.toString(), localePrefix)
            this.debounceTimers.delete(key)
          }, this.options.debounceMs ?? 100)
        )
      })

      this.watchers.push(watcher)
    } catch (_e) {
      // If recursive fails, try without it
      try {
        const watcher = watch(watchPath, { recursive: false }, (_eventType, filename) => {
          if (!filename) {
            return
          }
          this.handleFileChange(collection, filename.toString(), localePrefix)
        })
        this.watchers.push(watcher)
      } catch (err) {
        console.error(`[ContentWatcher] Failed to watch ${watchPath}:`, err)
      }
    }
  }

  private handleFileChange(collection: string, filename: string, localePrefix?: string) {
    // Handle both / and \ as separators
    const parts = filename.split(/[/\\]/)

    let locale: string
    let file: string

    if (parts.length >= 2) {
      // If filename is "en/test.md"
      locale = parts[parts.length - 2]
      file = parts[parts.length - 1]
    } else if (localePrefix) {
      // If we are watching a locale directory directly
      locale = localePrefix
      file = parts[0]
    } else {
      // No locale found, and no prefix. Monolith expects collection/locale/slug.md
      return
    }

    if (!file.endsWith('.md')) {
      return
    }

    const slug = file.replace(/\.md$/, '')

    this.contentManager.invalidate(collection, slug, locale)
  }

  close(): void {
    for (const watcher of this.watchers) {
      watcher.close()
    }
    this.watchers = []

    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer)
    }
    this.debounceTimers.clear()
  }
}
