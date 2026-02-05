import { describe, expect, it, mock } from 'bun:test'
import { StorageManager } from '../src/StorageManager'
import type { StorageStore } from '../src/store'
import type { StorageHooks } from '../src/types'

/**
 * 建立完整的 mock StorageStore
 * 用於測試 StorageManager 的代理方法
 */
function createMockStore(): StorageStore {
  return {
    put: mock(async () => {}),
    get: mock(async () => new Blob(['content'])),
    delete: mock(async () => true),
    exists: mock(async () => true),
    copy: mock(async () => {}),
    move: mock(async () => {}),
    list: mock(async function* () {
      yield { key: 'item1.txt', isDirectory: false, size: 10 }
      yield { key: 'item2.txt', isDirectory: false, size: 20 }
    }),
    getMetadata: mock(async () => ({
      key: 'file.txt',
      size: 100,
      mimeType: 'text/plain',
    })),
    getUrl: mock((key: string) => `/test/${key}`),
    getSignedUrl: mock(async (_key: string, _expires: number) => 'https://signed.example.com/url'),
    putStream: mock(async () => {}),
    getStream: mock(
      async () =>
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('stream data'))
            controller.close()
          },
        })
    ),
    listPaginated: mock(async () => ({
      items: [{ key: 'paginated.txt', isDirectory: false, size: 5 }],
      nextCursor: null,
      hasMore: false,
      count: 1,
    })),
    setMetadata: mock(async () => {}),
  }
}

function createMockHooks(): StorageHooks {
  return {
    applyFilter: mock(async <T>(_hook: string, value: T) => value),
    doAction: mock(async () => {}),
  }
}

describe('StorageManager - Proxy Methods', () => {
  describe('list', () => {
    it('should delegate list to default disk', async () => {
      const store = createMockStore()
      const manager = new StorageManager(() => store, { default: 'test' })

      const items: unknown[] = []
      for await (const item of manager.list('prefix')) {
        items.push(item)
      }

      expect(items).toHaveLength(2)
      expect(items[0]).toMatchObject({ key: 'item1.txt' })
      expect(items[1]).toMatchObject({ key: 'item2.txt' })
    })

    it('should delegate list without prefix to default disk', async () => {
      const store = createMockStore()
      const manager = new StorageManager(() => store, { default: 'test' })

      const items: unknown[] = []
      for await (const item of manager.list()) {
        items.push(item)
      }

      expect(items).toHaveLength(2)
    })
  })

  describe('getSignedUrl', () => {
    it('should delegate getSignedUrl to default disk', async () => {
      const store = createMockStore()
      const hooks = createMockHooks()
      const manager = new StorageManager(() => store, { default: 'test' }, hooks)

      const url = await manager.getSignedUrl('file.txt', 3600)

      expect(url).toBe('https://signed.example.com/url')
    })
  })

  describe('putStream', () => {
    it('should delegate putStream to default disk', async () => {
      const store = createMockStore()
      const hooks = createMockHooks()
      const manager = new StorageManager(() => store, { default: 'test' }, hooks)

      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data'))
          controller.close()
        },
      })

      await manager.putStream('stream.txt', stream)

      expect(store.putStream).toHaveBeenCalled()
    })
  })

  describe('getStream', () => {
    it('should delegate getStream to default disk', async () => {
      const store = createMockStore()
      const hooks = createMockHooks()
      const manager = new StorageManager(() => store, { default: 'test' }, hooks)

      const stream = await manager.getStream('file.txt')

      expect(stream).not.toBeNull()
    })
  })

  describe('listPaginated', () => {
    it('should delegate listPaginated to default disk', async () => {
      const store = createMockStore()
      const manager = new StorageManager(() => store, { default: 'test' })

      const result = await manager.listPaginated('prefix/', { maxResults: 10 })

      expect(result.count).toBe(1)
      expect(result.items[0].key).toBe('paginated.txt')
    })
  })

  describe('setMetadata', () => {
    it('should delegate setMetadata to default disk', async () => {
      const store = createMockStore()
      const manager = new StorageManager(() => store, { default: 'test' })

      await manager.setMetadata('file.txt', { author: 'test' })

      expect(store.setMetadata).toHaveBeenCalled()
    })
  })
})

describe('StorageManager - Lazy Initialization', () => {
  it('should not create store until disk is accessed', () => {
    const factory = mock(() => createMockStore())
    const _manager = new StorageManager(factory, { default: 'test' })

    // Factory 不應在建構時被呼叫
    expect(factory).not.toHaveBeenCalled()
  })

  it('should create store only once per disk name', () => {
    const factory = mock(() => createMockStore())
    const manager = new StorageManager(factory, { default: 'test' })

    const disk1 = manager.disk('test')
    const disk2 = manager.disk('test')

    expect(disk1).toBe(disk2)
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('should create different stores for different disk names', () => {
    const factory = mock(() => createMockStore())
    const manager = new StorageManager(factory, { default: 'disk-a' })

    const diskA = manager.disk('disk-a')
    const diskB = manager.disk('disk-b')

    expect(diskA).not.toBe(diskB)
    expect(factory).toHaveBeenCalledTimes(2)
  })

  it('should use default disk name when no name provided', () => {
    const factory = mock((name: string) => {
      if (name === 'my-default') {
        return createMockStore()
      }
      throw new Error(`Unexpected disk: ${name}`)
    })
    const manager = new StorageManager(factory, { default: 'my-default' })

    const disk = manager.disk()
    expect(disk).toBeDefined()
    expect(factory).toHaveBeenCalledWith('my-default')
  })
})

describe('StorageManager - All Proxy Methods Delegate to Default Disk', () => {
  it('put should delegate to default disk', async () => {
    const store = createMockStore()
    const manager = new StorageManager(() => store, { default: 'test' })

    await manager.put('key.txt', 'data')
    expect(store.put).toHaveBeenCalled()
  })

  it('get should delegate to default disk', async () => {
    const store = createMockStore()
    const manager = new StorageManager(() => store, { default: 'test' })

    const result = await manager.get('key.txt')
    expect(result).toBeInstanceOf(Blob)
  })

  it('delete should delegate to default disk', async () => {
    const store = createMockStore()
    const manager = new StorageManager(() => store, { default: 'test' })

    const result = await manager.delete('key.txt')
    expect(result).toBe(true)
  })

  it('exists should delegate to default disk', async () => {
    const store = createMockStore()
    const manager = new StorageManager(() => store, { default: 'test' })

    const result = await manager.exists('key.txt')
    expect(result).toBe(true)
  })

  it('copy should delegate to default disk', async () => {
    const store = createMockStore()
    const manager = new StorageManager(() => store, { default: 'test' })

    await manager.copy('from.txt', 'to.txt')
    expect(store.copy).toHaveBeenCalled()
  })

  it('move should delegate to default disk', async () => {
    const store = createMockStore()
    const manager = new StorageManager(() => store, { default: 'test' })

    await manager.move('from.txt', 'to.txt')
    expect(store.move).toHaveBeenCalled()
  })

  it('getMetadata should delegate to default disk', async () => {
    const store = createMockStore()
    const manager = new StorageManager(() => store, { default: 'test' })

    const result = await manager.getMetadata('file.txt')
    expect(result).toMatchObject({ key: 'file.txt', size: 100 })
  })

  it('getUrl should delegate to default disk', () => {
    const store = createMockStore()
    const manager = new StorageManager(() => store, { default: 'test' })

    const url = manager.getUrl('file.txt')
    expect(url).toBe('/test/file.txt')
  })
})
