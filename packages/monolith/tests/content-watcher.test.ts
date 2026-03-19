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

    const watcher = new ContentWatcher(manager, TMP_DIR, { debounceMs: 5000 })
    watcher.watch('docs')

    // Write file to trigger debounce timer creation
    await writeFile(join(TMP_DIR, 'docs', 'en', 'test.md'), '# Changed')

    // Poll for debounce timer and verify it was unref'd
    // We need to wait for FSWatcher event + timer creation, which can be slow in CI
    let foundUnrefTimer = false
    let timerMapHasContent = false
    for (let i = 0; i < 200; i++) {
      // @ts-expect-error - accessing private property for testing
      const timers = watcher.debounceTimers as Map<string, ReturnType<typeof setTimeout>>
      if (timers.size > 0) {
        timerMapHasContent = true
        // Check if timer has been unref'd (hasRef() returns false after unref)
        for (const timer of timers.values()) {
          if (typeof timer.hasRef === 'function' && !timer.hasRef()) {
            foundUnrefTimer = true
            break
          }
        }
        if (foundUnrefTimer) break
      }
      await new Promise((r) => setTimeout(r, 25))
    }

    // Verify that debounce timer was created and unref'd
    expect(timerMapHasContent).toBe(true)
    expect(foundUnrefTimer).toBe(true)

    watcher.close()
  })
})
