import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { existsSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ContentManager } from '../src/ContentManager'
import { ContentWatcher } from '../src/ContentWatcher'
import { LocalDriver } from '../src/driver/LocalDriver'

const TMP_DIR = join(import.meta.dir, 'tmp_watch')

describe('ContentWatcher', () => {
  beforeEach(async () => {
    if (existsSync(TMP_DIR)) await rm(TMP_DIR, { recursive: true, force: true })
    await mkdir(join(TMP_DIR, 'docs', 'en'), { recursive: true })
    await writeFile(join(TMP_DIR, 'docs', 'en', 'test.md'), '# Original')
  })

  afterEach(async () => {
    if (existsSync(TMP_DIR)) await rm(TMP_DIR, { recursive: true, force: true })
  })

  it('should invalidate cache on file change', async () => {
    const manager = new ContentManager(new LocalDriver(TMP_DIR))
    manager.defineCollection('docs', { path: 'docs' })

    // Prime cache
    await manager.find('docs', 'test')
    // @ts-expect-error
    expect(manager.cache.size).toBe(1)

    const watcher = new ContentWatcher(manager, TMP_DIR, { debounceMs: 10 })
    watcher.watch('docs')

    // Simulate change
    await writeFile(join(TMP_DIR, 'docs', 'en', 'test.md'), '# Changed')

    // Wait for debounce
    await new Promise((r) => setTimeout(r, 500))

    // Cache should be cleared for that item
    // @ts-expect-error
    expect(manager.cache.size).toBe(0)

    watcher.close()
  })
})
