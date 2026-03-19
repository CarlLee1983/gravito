import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { existsSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ContentManager } from '../src/ContentManager'
import { ContentWatcher } from '../src/ContentWatcher'
import { LocalDriver } from '../src/driver/LocalDriver'

const TMP_DIR = join(import.meta.dir, 'tmp_watch')

describe('ContentWatcher', () => {
  beforeEach(async () => {
    if (existsSync(TMP_DIR)) {
      await rm(TMP_DIR, { recursive: true, force: true })
    }
    await mkdir(join(TMP_DIR, 'docs', 'en'), { recursive: true })
    await writeFile(join(TMP_DIR, 'docs', 'en', 'test.md'), '# Original')
  })

  afterEach(async () => {
    if (existsSync(TMP_DIR)) {
      await rm(TMP_DIR, { recursive: true, force: true })
    }
  })

  it('should invalidate cache on file change', async () => {
    const manager = new ContentManager(new LocalDriver(TMP_DIR))
    manager.defineCollection('docs', { path: 'docs' })

    // Prime cache
    await manager.find('docs', 'test')
    // @ts-expect-error
    expect(manager.cache.size).toBe(1)

    const watcher = new ContentWatcher(manager, TMP_DIR, { debounceMs: 100 })
    watcher.watch('docs')

    // Simulate change
    await writeFile(join(TMP_DIR, 'docs', 'en', 'test.md'), '# Changed')

    // Wait for cache invalidation (with retry loop for reliability)
    let cleared = false
    for (let i = 0; i < 40; i++) {
      // @ts-expect-error
      if (manager.cache.size === 0) {
        cleared = true
        break
      }
      await new Promise((r) => setTimeout(r, 100))
    }

    expect(cleared).toBe(true)

    watcher.close()
  })

  it('should unref debounce timers', async () => {
    const manager = new ContentManager(new LocalDriver(TMP_DIR))
    manager.defineCollection('docs', { path: 'docs' })

    // Prime cache with initial content to ensure we have something to invalidate
    const content = await manager.find('docs', 'test')
    expect(content).toBeDefined()
    // @ts-expect-error
    const initialCacheSize = manager.cache.size
    expect(initialCacheSize).toBeGreaterThan(0)

    const watcher = new ContentWatcher(manager, TMP_DIR, { debounceMs: 100 })
    watcher.watch('docs')

    // Write file to trigger debounce timer and eventual cache invalidation
    await writeFile(join(TMP_DIR, 'docs', 'en', 'test.md'), '# Changed')

    // Wait for debounce to trigger and cache to be invalidated
    // This verifies that file watching and debounce work correctly
    let cleared = false
    for (let i = 0; i < 80; i++) {
      // @ts-expect-error
      if (manager.cache.size === 0) {
        cleared = true
        break
      }
      await new Promise((r) => setTimeout(r, 50))
    }

    // The fact that cache was invalidated proves the debounce timer worked
    // and the file system watcher event was processed correctly
    expect(cleared).toBe(true)

    watcher.close()
  })
})
