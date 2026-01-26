import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import orbitStorage, { OrbitNebula } from '../src/index'

let tempDir = ''

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'nebula-manager-'))
})

afterAll(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true })
  }
})

const createCore = (config?: any) => {
  let middleware: ((c: any, next: () => Promise<void>) => Promise<undefined | undefined>) | null =
    null

  const core = {
    config: {
      get: (key: string) => (key === 'storage' ? config : undefined),
      has: (key: string) => key === 'storage' && !!config,
    },
    container: {
      instance: mock(() => {}),
      make: mock(() => {}),
    },
    logger: {
      info: mock(() => {}),
    },
    hooks: {
      applyFilters: mock(async (_hook: string, value: unknown) => value),
      doAction: mock(async () => {}),
    },
    adapter: {
      use: mock((_path: string, handler: typeof middleware) => {
        middleware = handler
      }),
    },
    get middleware() {
      return middleware
    },
  }

  return core
}

describe('OrbitNebula - Multi-Disk Support', () => {
  it('should support multiple disks', async () => {
    const core = createCore()

    const storage = orbitStorage(core as any, {
      default: 'local',
      disks: {
        local: { driver: 'local', root: tempDir, baseUrl: '/local' },
        temp: { driver: 'memory' },
      },
    })

    await storage.put('file1.txt', 'local content')
    expect(await storage.exists('file1.txt')).toBe(true)
    expect(storage.getUrl('file1.txt')).toBe('/local/file1.txt')

    await storage.disk('temp').put('file2.txt', 'memory content')
    expect(await storage.disk('temp').exists('file2.txt')).toBe(true)
    expect(storage.disk('temp').getUrl('file2.txt')).toBe('/memory/file2.txt')

    expect(await storage.exists('file2.txt')).toBe(false)
    expect(await storage.disk('temp').exists('file1.txt')).toBe(false)
  })

  it('should cache disk instances', async () => {
    const core = createCore()

    const storage = orbitStorage(core as any, {
      disks: {
        local: { driver: 'local', root: tempDir },
      },
    })

    const disk1 = storage.disk('local')
    const disk2 = storage.disk('local')

    expect(disk1).toBe(disk2)
  })

  it('should throw when accessing non-existent disk', () => {
    const core = createCore()

    const storage = orbitStorage(core as any, {
      disks: {
        local: { driver: 'local', root: tempDir },
      },
    })

    expect(() => storage.disk('non-existent')).toThrow(/not configured/)
  })
})

describe('OrbitNebula - Backward Compatibility', () => {
  it('should support legacy local option', async () => {
    const core = createCore()

    const storage = orbitStorage(core as any, {
      local: { root: tempDir, baseUrl: '/legacy' },
    })

    await storage.put('legacy.txt', 'legacy content')
    expect(await storage.exists('legacy.txt')).toBe(true)
    expect(storage.getUrl('legacy.txt')).toBe('/legacy/legacy.txt')
  })

  it('should support legacy provider option', async () => {
    const core = createCore()

    const { MemoryStore } = await import('../src/stores/MemoryStore')
    const customProvider = new MemoryStore()

    const storage = orbitStorage(core as any, {
      provider: customProvider,
    })

    await storage.put('custom.txt', 'custom content')
    expect(await storage.exists('custom.txt')).toBe(true)
  })
})

describe('OrbitNebula - Hooks Integration', () => {
  it('should trigger storage:upload filter', async () => {
    const core = createCore()

    core.hooks.applyFilters = mock(async (hook: string, value: unknown) => {
      if (hook === 'storage:upload') {
        return `[FILTERED] ${value}`
      }
      return value
    })

    const storage = orbitStorage(core as any, {
      default: 'temp',
      disks: { temp: { driver: 'memory' } },
    })

    await storage.put('filtered.txt', 'original')

    expect(core.hooks.applyFilters).toHaveBeenCalledWith('storage:upload', 'original', {
      key: 'filtered.txt',
    })

    const data = await storage.get('filtered.txt')
    expect(await data?.text()).toBe('[FILTERED] original')
  })

  it('should trigger storage:uploaded action', async () => {
    const core = createCore()

    const storage = orbitStorage(core as any, {
      default: 'temp',
      disks: { temp: { driver: 'memory' } },
    })

    await storage.put('action-test.txt', 'content')

    expect(core.hooks.doAction).toHaveBeenCalledWith('storage:uploaded', { key: 'action-test.txt' })
  })

  it('should trigger storage:hit and storage:miss', async () => {
    const core = createCore()

    const storage = orbitStorage(core as any, {
      default: 'temp',
      disks: { temp: { driver: 'memory' } },
    })

    await storage.put('hit-test.txt', 'content')

    await storage.get('hit-test.txt')
    expect(core.hooks.doAction).toHaveBeenCalledWith('storage:hit', { key: 'hit-test.txt' })

    await storage.get('miss-test.txt')
    expect(core.hooks.doAction).toHaveBeenCalledWith('storage:miss', { key: 'miss-test.txt' })
  })
})

describe('OrbitNebula - New Features', () => {
  it('should support exists()', async () => {
    const core = createCore()

    const storage = orbitStorage(core as any, {
      default: 'temp',
      disks: { temp: { driver: 'memory' } },
    })

    expect(await storage.exists('test.txt')).toBe(false)

    await storage.put('test.txt', 'content')
    expect(await storage.exists('test.txt')).toBe(true)
  })

  it('should support copy()', async () => {
    const core = createCore()

    const storage = orbitStorage(core as any, {
      default: 'temp',
      disks: { temp: { driver: 'memory' } },
    })

    await storage.put('original.txt', 'content')
    await storage.copy('original.txt', 'copy.txt')

    expect(await storage.exists('copy.txt')).toBe(true)
    expect(await (await storage.get('copy.txt'))?.text()).toBe('content')
  })

  it('should support move()', async () => {
    const core = createCore()

    const storage = orbitStorage(core as any, {
      default: 'temp',
      disks: { temp: { driver: 'memory' } },
    })

    await storage.put('source.txt', 'content')
    await storage.move('source.txt', 'dest.txt')

    expect(await storage.exists('source.txt')).toBe(false)
    expect(await storage.exists('dest.txt')).toBe(true)
  })

  it('should support getMetadata()', async () => {
    const core = createCore()

    const storage = orbitStorage(core as any, {
      default: 'temp',
      disks: { temp: { driver: 'memory' } },
    })

    await storage.put('meta.txt', 'hello world')
    const meta = await storage.getMetadata('meta.txt')

    expect(meta).toMatchObject({
      key: 'meta.txt',
      size: 11,
    })
  })
})

describe('OrbitNebula - getStorage()', () => {
  it('should return installed manager', () => {
    const core = createCore()
    const orbit = new OrbitNebula({
      default: 'temp',
      disks: { temp: { driver: 'memory' } },
    })

    orbit.install(core as any)
    const storage = orbit.getStorage()

    expect(storage).toBeDefined()
    expect(typeof storage.put).toBe('function')
  })

  it('should throw if not installed', () => {
    const orbit = new OrbitNebula({
      disks: { temp: { driver: 'memory' } },
    })

    expect(() => orbit.getStorage()).toThrow(/StorageManager not initialized/)
  })
})
