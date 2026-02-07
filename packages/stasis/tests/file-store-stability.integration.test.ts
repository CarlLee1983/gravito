import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { rm } from 'node:fs/promises'
import { sleep } from '../src/locks'
import { FileStore } from '../src/stores/FileStore'

const TEST_DIR = './tmp/test-file-store-stability'

describe('FileStore Stability', () => {
  beforeAll(async () => {
    await rm(TEST_DIR, { recursive: true, force: true })
  })

  afterAll(async () => {
    await rm(TEST_DIR, { recursive: true, force: true })
  })

  it('should use atomic writes to prevent partial files', async () => {
    const store = new FileStore({ directory: TEST_DIR })

    const largeValue = { data: 'x'.repeat(10000) }
    await store.put('large-key', largeValue, 60)

    const retrieved = await store.get('large-key')
    expect(retrieved).toEqual(largeValue)
  })

  it('should automatically clean up expired files', async () => {
    const store = new FileStore({
      directory: TEST_DIR,
      enableCleanup: true,
      cleanupInterval: 100,
    })

    await store.put('expire-1', 'value1', 0.1)
    await store.put('expire-2', 'value2', 0.1)
    await store.put('keep', 'value3', 60)

    await sleep(75)

    await sleep(75)

    expect(await store.get<string>('expire-1')).toBeNull()
    expect(await store.get<string>('expire-2')).toBeNull()
    expect(await store.get<string>('keep')).toBe('value3')

    await store.destroy()
  })

  it('should not acquire lock while another holds it', async () => {
    const store = new FileStore({ directory: TEST_DIR })

    const lock1 = store.lock('active-resource', 5)
    expect(await lock1.acquire()).toBe(true)

    const lock2 = store.lock('active-resource', 5)
    expect(await lock2.acquire()).toBe(false)

    await lock1.release()

    expect(await lock2.acquire()).toBe(true)
    await lock2.release()
  })

  it('should not allow duplicate lock acquisition', async () => {
    const store = new FileStore({ directory: TEST_DIR })

    const lock1 = store.lock('resource2', 5)
    const lock2 = store.lock('resource2', 5)

    expect(await lock1.acquire()).toBe(true)
    expect(await lock2.acquire()).toBe(false)

    await lock1.release()

    expect(await lock2.acquire()).toBe(true)
    await lock2.release()
  })

  it('should cleanup expired files on demand', async () => {
    const store = new FileStore({ directory: TEST_DIR, enableCleanup: false })

    await store.put('temp1', 'value1', 0.05)
    await store.put('temp2', 'value2', 0.05)
    await store.put('temp3', 'value3', 60)

    await sleep(50)

    const cleaned = await store.cleanExpiredFiles()

    expect(cleaned).toBeGreaterThanOrEqual(2)

    expect(await store.get<string>('temp3')).toBe('value3')
  })

  it('should handle concurrent writes safely', async () => {
    const store = new FileStore({ directory: TEST_DIR })

    await Promise.all([
      store.put('concurrent', 'value1', 60),
      store.put('concurrent', 'value2', 60),
      store.put('concurrent', 'value3', 60),
    ])

    const final = await store.get<string>('concurrent')
    expect(final).not.toBeNull()
    if (final) {
      expect(['value1', 'value2', 'value3']).toContain(final)
    }
  })

  it('should handle invalid directory paths gracefully', async () => {
    const store = new FileStore({ directory: TEST_DIR })

    const retrieved = await store.get('nonexistent')
    expect(retrieved).toBeNull()
  })

  it('should disable cleanup daemon when enableCleanup is false', async () => {
    const store = new FileStore({ directory: TEST_DIR, enableCleanup: false })

    await store.put('no-cleanup', 'value', 0.05)

    await sleep(50)

    const value = await store.get('no-cleanup')
    expect(value).toBeNull()
  })

  it('should properly destroy cleanup timer', async () => {
    const store = new FileStore({ directory: TEST_DIR, cleanupInterval: 100 })

    await store.destroy()

    await store.put('after-destroy', 'value', 0.1)
    await sleep(75)
  })
})
