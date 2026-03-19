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

    const watcher = new ContentWatcher(manager, TMP_DIR, { debounceMs: 30 })
    const unrefCalls: Timeout[] = []
    const originalSetTimeout = global.setTimeout

    // Spy on setTimeout to track unref calls
    global.setTimeout = ((fn: () => void, delay?: number) => {
      const tid = originalSetTimeout(fn, delay)
      const originalUnref = tid.unref?.bind(tid)
      if (originalUnref) {
        tid.unref = () => {
          unrefCalls.push(tid)
          return originalUnref()
        }
      }
      return tid
    }) as typeof setTimeout

    try {
      watcher.watch('docs')
      await writeFile(join(TMP_DIR, 'docs', 'en', 'test.md'), '# Changed Again')

      // Wait for fs.watch event and debounce + unref to complete
      await new Promise((resolve) => originalSetTimeout(resolve, 300))

      expect(unrefCalls.length).toBeGreaterThan(0)
    } finally {
      global.setTimeout = originalSetTimeout
      watcher.close()
    }
  })
})
