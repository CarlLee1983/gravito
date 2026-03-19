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

    // Store all timers created to verify unref is called
    const timersCreated: Array<{ timer: Timeout; unrefCalled: boolean }> = []
    const originalSetTimeout = global.setTimeout

    // Spy on setTimeout to track unref calls
    global.setTimeout = ((fn: () => void, delay?: number) => {
      const tid = originalSetTimeout(fn, delay)
      const timerInfo = { timer: tid, unrefCalled: false }
      timersCreated.push(timerInfo)

      // Replace unref to track when it's called
      const originalUnref = tid.unref
      if (originalUnref && typeof originalUnref === 'function') {
        tid.unref = function (this: Timeout) {
          timerInfo.unrefCalled = true
          return originalUnref.call(this)
        }
      }
      return tid
    }) as typeof setTimeout

    try {
      const watcher = new ContentWatcher(manager, TMP_DIR, { debounceMs: 50 })
      watcher.watch('docs')

      // Trigger multiple file writes to ensure debounce timer is created and unref is called
      for (let i = 0; i < 8; i++) {
        await writeFile(join(TMP_DIR, 'docs', 'en', 'test.md'), `# Changed ${i}`)
        // Wait between writes to trigger separate debounce events
        await new Promise((resolve) => originalSetTimeout(resolve, 25))
      }

      // Wait for final debounce to complete and ensure cleanup
      await new Promise((resolve) => originalSetTimeout(resolve, 300))

      // Verify that at least one timer was created with unref called
      const timerWithUnref = timersCreated.find((info) => info.unrefCalled)
      expect(timerWithUnref).toBeDefined()
      expect(timerWithUnref?.unrefCalled).toBe(true)

      watcher.close()
    } finally {
      global.setTimeout = originalSetTimeout
    }
  })
})
