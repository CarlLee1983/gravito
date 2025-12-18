import { afterAll, describe, expect, it, mock } from 'bun:test'
import { rmdir } from 'node:fs/promises'
import { PlanetCore } from 'gravito-core'
import orbitStorage from '../src/index'

const TEST_DIR = './test-storage'

describe('OrbitStorage', () => {
  afterAll(async () => {
    try {
      await rmdir(TEST_DIR, { recursive: true })
    } catch {
      // Ignore cleanup errors in tests
    }
  })

  it('should register local storage provider', async () => {
    const core = new PlanetCore()
    // Mock hooks
    core.hooks.doAction = mock((_hook, _args) => Promise.resolve())
    core.hooks.applyFilters = mock((_hook, val) => Promise.resolve(val))

    const storage = orbitStorage(core, {
      local: { root: TEST_DIR },
    })

    expect(storage).toBeDefined()
    // expect(storage).toBeInstanceOf(LocalStorageProvider); // Wrapper makes this fail, check methods instead
    expect(typeof storage.put).toBe('function')

    await storage.put('test.txt', 'hello')

    expect(core.hooks.applyFilters).toHaveBeenCalledWith('storage:upload', 'hello', {
      key: 'test.txt',
    })
    expect(core.hooks.doAction).toHaveBeenCalledWith('storage:uploaded', { key: 'test.txt' })

    const file = Bun.file(`${TEST_DIR}/test.txt`)
    expect(await file.text()).toBe('hello')
  })
})
