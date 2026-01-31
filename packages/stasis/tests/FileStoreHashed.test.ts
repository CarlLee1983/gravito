import { afterEach, describe, expect, test } from 'bun:test'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { FileStore } from '../src/stores/FileStore'

const TEST_DIR = './tmp/test-filestore-hashed'

describe('FileStore Hashed Directories', () => {
  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true }).catch(() => {})
  })

  test('creates nested directories when enabled', async () => {
    const store = new FileStore({
      directory: TEST_DIR,
      useSubdirectories: true,
    })

    const key = 'test-key'
    await store.put(key, 'value', 60)

    // Verify file exists
    const val = await store.get(key)
    expect(val).toBe('value')

    // Verify physical structure
    // We can't easily predict the exact hash without importing hashKey,
    // but we can verify that subdirectories exist in TEST_DIR
    const fs = require('node:fs')
    const l1 = fs.readdirSync(TEST_DIR)
    expect(l1.length).toBeGreaterThan(0)

    // Check if first level is a directory and has 2 chars
    const d1 = l1[0]
    expect(d1.length).toBe(2)
    const stat1 = fs.statSync(join(TEST_DIR, d1))
    expect(stat1.isDirectory()).toBe(true)

    // Check level 2
    const l2 = fs.readdirSync(join(TEST_DIR, d1))
    expect(l2.length).toBeGreaterThan(0)
    const d2 = l2[0]
    expect(d2.length).toBe(2)
    const stat2 = fs.statSync(join(TEST_DIR, d1, d2))
    expect(stat2.isDirectory()).toBe(true)
  })

  test('flush removes nested directories', async () => {
    const store = new FileStore({
      directory: TEST_DIR,
      useSubdirectories: true,
    })

    await store.put('k1', 'v1', 60)
    await store.put('k2', 'v2', 60)

    await store.flush()

    const fs = require('node:fs')
    const files = fs.readdirSync(TEST_DIR)
    expect(files.length).toBe(0)
  })

  test('cleanup works with nested directories', async () => {
    const store = new FileStore({
      directory: TEST_DIR,
      useSubdirectories: true,
      enableCleanup: true,
      cleanupInterval: 100,
    })

    await store.put('expired', 'val', 0.001) // 1ms
    await store.put('valid', 'val', 60)

    await new Promise((r) => setTimeout(r, 10))

    // Run cleanup manually
    const cleaned = await store.cleanExpiredFiles()
    expect(cleaned).toBe(1)

    expect(await store.get('expired')).toBeNull()
    expect(await store.get<string>('valid')).toBe('val')
  })
})
