import { type FSWatcher, watch } from 'node:fs'
import { join, sep } from 'node:path'
import type { ContentManager } from './ContentManager'

interface WatcherOptions {
  debounceMs?: number
}

export class ContentWatcher {
  private watchers: FSWatcher[] = []
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()

  constructor(
    private contentManager: ContentManager,
    private options: WatcherOptions = {}
  ) {}

  watch(collectionName: string): void {
    const config = this.contentManager.getCollectionConfig(collectionName)
    if (!config) {
      console.warn(`[ContentWatcher] Collection '${collectionName}' not found`)
      return
    }

    const rootDir = this.contentManager.rootDir
    const watchPath = join(rootDir, config.path)

    try {
      const watcher = watch(watchPath, { recursive: true }, (_eventType, filename) => {
        if (!filename) {
          return
        }

        const key = `${collectionName}:${filename}`
        if (this.debounceTimers.has(key)) {
          clearTimeout(this.debounceTimers.get(key))
        }

        this.debounceTimers.set(
          key,
          setTimeout(() => {
            this.handleFileChange(collectionName, filename.toString())
            this.debounceTimers.delete(key)
          }, this.options.debounceMs ?? 100)
        )
      })

      this.watchers.push(watcher)
    } catch (e) {
      console.error(`[ContentWatcher] Failed to watch ${watchPath}:`, e)
    }
  }

  private handleFileChange(collection: string, filename: string) {
    const parts = filename.split(sep)
    if (parts.length < 2) {
      return
    }

    const locale = parts[parts.length - 2]
    const file = parts[parts.length - 1]

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
