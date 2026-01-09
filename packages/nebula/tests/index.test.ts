import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import orbitStorage, { LocalStorageProvider, OrbitNebula } from '../src/index'

let tempDir = ''

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'gravito-nebula-'))
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

describe('OrbitNebula', () => {
  it('installs storage service and injects context helper', async () => {
    const core = createCore({
      local: { root: tempDir },
      exposeAs: 'storage',
    })

    const orbit = new OrbitNebula()
    orbit.install(core as any)

    expect(core.adapter.use).toHaveBeenCalled()
    expect(core.hooks.doAction).toHaveBeenCalledWith('storage:init', expect.any(Object))

    const context: Record<string, unknown> = {
      set: (key: string, value: unknown) => {
        context[key] = value
      },
    }

    const middleware = core.middleware
    expect(middleware).toBeDefined()
    await middleware?.(context, async () => {})

    expect(context.storage).toBeDefined()

    const storage = context.storage as {
      put: (key: string, data: string) => Promise<void>
      get: (key: string) => Promise<Blob | null>
      delete: (key: string) => Promise<void>
      getUrl: (key: string) => string
    }
    await storage.put('orbit.txt', 'orbit-data')

    expect(core.hooks.applyFilters).toHaveBeenCalledWith('storage:upload', 'orbit-data', {
      key: 'orbit.txt',
    })
    expect(core.hooks.doAction).toHaveBeenCalledWith('storage:uploaded', { key: 'orbit.txt' })

    const file = Bun.file(`${tempDir}/orbit.txt`)
    expect(await file.text()).toBe('orbit-data')

    const stored = await storage.get('orbit.txt')
    expect(await stored?.text()).toBe('orbit-data')

    expect(storage.getUrl('orbit.txt')).toContain('orbit.txt')

    await storage.delete('orbit.txt')
    expect(await storage.get('orbit.txt')).toBeNull()
  })

  it('throws when no storage config is provided', () => {
    const core = createCore(undefined)
    const orbit = new OrbitNebula()
    expect(() => orbit.install(core as any)).toThrow(
      '[OrbitNebula] Configuration is required. Please provide options or set "storage" in core config.'
    )
  })

  it('throws when no provider can be resolved', () => {
    const core = createCore({ exposeAs: 'storage' })
    const orbit = new OrbitNebula()
    expect(() => orbit.install(core as any)).toThrow(
      '[OrbitNebula] No provider configured. Please provide a provider instance or local configuration.'
    )
  })
})

describe('orbitStorage', () => {
  it('wraps provider with hooks and stores files', async () => {
    const core = createCore({
      local: { root: tempDir },
    })

    const storage = orbitStorage(core as any, {
      local: { root: tempDir },
    })

    await storage.put('test.txt', 'hello')

    expect(core.hooks.applyFilters).toHaveBeenCalledWith('storage:upload', 'hello', {
      key: 'test.txt',
    })
    expect(core.hooks.doAction).toHaveBeenCalledWith('storage:uploaded', { key: 'test.txt' })

    const file = Bun.file(`${tempDir}/test.txt`)
    expect(await file.text()).toBe('hello')

    const stored = await storage.get('test.txt')
    expect(await stored?.text()).toBe('hello')
    expect(storage.getUrl('test.txt')).toContain('test.txt')

    await storage.delete('test.txt')
    expect(await storage.get('test.txt')).toBeNull()
  })

  it('throws when provider is missing', () => {
    const core = createCore({
      local: undefined,
    })

    expect(() =>
      orbitStorage(
        core as any,
        {
          local: undefined,
        } as any
      )
    ).toThrow('[OrbitNebula] No provider configured.')
  })
})

describe('LocalStorageProvider', () => {
  it('stores, reads, and deletes files', async () => {
    const provider = new LocalStorageProvider(tempDir, '/storage')
    await provider.put('sample.txt', 'content')

    const file = await provider.get('sample.txt')
    expect(file).toBeInstanceOf(Blob)
    expect(await file?.text()).toBe('content')

    expect(provider.getUrl('sample.txt')).toBe('/storage/sample.txt')

    await provider.delete('sample.txt')
    const deleted = await provider.get('sample.txt')
    expect(deleted).toBeNull()
  })
})
