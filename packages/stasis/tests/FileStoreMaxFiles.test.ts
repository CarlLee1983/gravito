import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { sleep } from '../src/locks'
import { FileStore } from '../src/stores/FileStore'

describe('FileStore maxFiles', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'gravito-stasis-maxfiles-'))
  })

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true }).catch(() => {})
  })

  test('enforces maxFiles limit by removing oldest files', async () => {
    const store = new FileStore({
      directory: testDir,
      enableCleanup: true,
      cleanupInterval: 100, // fast cleanup for test
      maxFiles: 3,
    })

    // Write 5 files with slight delays to ensure mtime differences
    await store.put('key1', 'val1', 60)
    await sleep(50)
    await store.put('key2', 'val2', 60)
    await sleep(50)
    await store.put('key3', 'val3', 60)
    await sleep(50)
    await store.put('key4', 'val4', 60)
    await sleep(50)
    await store.put('key5', 'val5', 60)

    // Wait for cleanup daemon to run
    await sleep(500)

    // Check directly which files remain
    const fs = require('node:fs')
    const files = fs.readdirSync(testDir).filter((f: string) => f.endsWith('.json'))

    expect(files.length).toBeLessThanOrEqual(3)

    // key1 and key2 should be gone (oldest)
    // key3, key4, key5 should remain
    const val1 = await store.get('key1')
    const val2 = await store.get('key2')
    const val3 = await store.get('key3')
    const val5 = await store.get('key5')

    expect(val1).toBeNull()
    expect(val2).toBeNull()
    expect(val3).toBe('val3')
    expect(val5).toBe('val5')

    await store.destroy()
  })
})
