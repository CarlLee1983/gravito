import { describe, expect, it, mock } from 'bun:test'
import { StorageRepository } from '../src/StorageRepository'
import type { StorageStore } from '../src/store'
import type { StorageHooks } from '../src/types'

/**
 * 建立一個完整的 mock StorageStore
 * 包含所有必要與可選方法
 */
function createMockStore(overrides?: Partial<StorageStore>): StorageStore {
  return {
    put: mock(async () => {}),
    get: mock(async () => null),
    delete: mock(async () => true),
    exists: mock(async () => false),
    copy: mock(async () => {}),
    move: mock(async () => {}),
    list: mock(async function* () {}),
    getMetadata: mock(async () => null),
    getUrl: mock((key: string) => `/mock/${key}`),
    getSignedUrl: mock(async (_key: string, _expires: number) => 'https://signed-url.example.com'),
    putStream: mock(async () => {}),
    getStream: mock(async () => null),
    listPaginated: mock(async () => ({
      items: [],
      nextCursor: null,
      hasMore: false,
      count: 0,
    })),
    setMetadata: mock(async () => {}),
    ...overrides,
  }
}

/**
 * 建立一個 mock StorageHooks
 */
function createMockHooks(): StorageHooks {
  return {
    applyFilter: mock(async <T>(_hook: string, value: T) => value),
    doAction: mock(async () => {}),
  }
}

describe('StorageRepository', () => {
  // ==================== put ====================
  describe('put', () => {
    it('should delegate to store.put', async () => {
      const store = createMockStore()
      const repo = new StorageRepository(store)

      await repo.put('key.txt', 'data')

      expect(store.put).toHaveBeenCalledWith('key.txt', 'data', undefined)
    })

    it('should apply storage:upload filter when hooks provided', async () => {
      const store = createMockStore()
      const hooks = createMockHooks()
      const repo = new StorageRepository(store, hooks)

      await repo.put('key.txt', 'original-data')

      expect(hooks.applyFilter).toHaveBeenCalledWith('storage:upload', 'original-data', {
        key: 'key.txt',
        options: undefined,
      })
    })

    it('should fire storage:uploaded action when hooks provided', async () => {
      const store = createMockStore()
      const hooks = createMockHooks()
      const repo = new StorageRepository(store, hooks)

      await repo.put('key.txt', 'data')

      expect(hooks.doAction).toHaveBeenCalledWith('storage:uploaded', {
        key: 'key.txt',
        options: undefined,
      })
    })

    it('should pass filtered data to store', async () => {
      const store = createMockStore()
      const hooks: StorageHooks = {
        applyFilter: mock(async <T>(_hook: string, _value: T) => '[TRANSFORMED]' as T),
        doAction: mock(async () => {}),
      }
      const repo = new StorageRepository(store, hooks)

      await repo.put('key.txt', 'original')

      expect(store.put).toHaveBeenCalledWith('key.txt', '[TRANSFORMED]', undefined)
    })

    it('should pass PutOptions to store and hooks', async () => {
      const store = createMockStore()
      const hooks = createMockHooks()
      const repo = new StorageRepository(store, hooks)

      const options = { contentType: 'text/plain', metadata: { tag: 'test' } }
      await repo.put('key.txt', 'data', options)

      expect(store.put).toHaveBeenCalledWith('key.txt', 'data', options)
      expect(hooks.applyFilter).toHaveBeenCalledWith('storage:upload', 'data', {
        key: 'key.txt',
        options,
      })
      expect(hooks.doAction).toHaveBeenCalledWith('storage:uploaded', {
        key: 'key.txt',
        options,
      })
    })

    it('should work without hooks (no filter/action)', async () => {
      const store = createMockStore()
      const repo = new StorageRepository(store)

      await repo.put('key.txt', 'data')

      expect(store.put).toHaveBeenCalledWith('key.txt', 'data', undefined)
    })
  })

  // ==================== get ====================
  describe('get', () => {
    it('should return data from store', async () => {
      const blob = new Blob(['content'])
      const store = createMockStore({ get: mock(async () => blob) })
      const repo = new StorageRepository(store)

      const result = await repo.get('key.txt')
      expect(result).toBe(blob)
    })

    it('should fire storage:hit when data exists and hooks provided', async () => {
      const blob = new Blob(['content'])
      const store = createMockStore({ get: mock(async () => blob) })
      const hooks = createMockHooks()
      const repo = new StorageRepository(store, hooks)

      await repo.get('key.txt')

      expect(hooks.doAction).toHaveBeenCalledWith('storage:hit', { key: 'key.txt' })
    })

    it('should fire storage:miss when data not found and hooks provided', async () => {
      const store = createMockStore({ get: mock(async () => null) })
      const hooks = createMockHooks()
      const repo = new StorageRepository(store, hooks)

      await repo.get('missing.txt')

      expect(hooks.doAction).toHaveBeenCalledWith('storage:miss', { key: 'missing.txt' })
    })

    it('should not fire hooks when no hooks provided', async () => {
      const store = createMockStore({ get: mock(async () => null) })
      const repo = new StorageRepository(store)

      await repo.get('key.txt')
      // 沒有 hooks 提供時不應拋出錯誤
      expect(store.get).toHaveBeenCalledWith('key.txt')
    })
  })

  // ==================== delete ====================
  describe('delete', () => {
    it('should return true when file deleted', async () => {
      const store = createMockStore({ delete: mock(async () => true) })
      const repo = new StorageRepository(store)

      expect(await repo.delete('key.txt')).toBe(true)
    })

    it('should return false when file not found', async () => {
      const store = createMockStore({ delete: mock(async () => false) })
      const repo = new StorageRepository(store)

      expect(await repo.delete('missing.txt')).toBe(false)
    })

    it('should fire storage:deleted when deleted and hooks provided', async () => {
      const store = createMockStore({ delete: mock(async () => true) })
      const hooks = createMockHooks()
      const repo = new StorageRepository(store, hooks)

      await repo.delete('key.txt')

      expect(hooks.doAction).toHaveBeenCalledWith('storage:deleted', { key: 'key.txt' })
    })

    it('should NOT fire storage:deleted when not deleted', async () => {
      const store = createMockStore({ delete: mock(async () => false) })
      const hooks = createMockHooks()
      const repo = new StorageRepository(store, hooks)

      await repo.delete('missing.txt')

      expect(hooks.doAction).not.toHaveBeenCalled()
    })
  })

  // ==================== exists ====================
  describe('exists', () => {
    it('should delegate to store.exists', async () => {
      const store = createMockStore({ exists: mock(async () => true) })
      const repo = new StorageRepository(store)

      expect(await repo.exists('key.txt')).toBe(true)
      expect(store.exists).toHaveBeenCalledWith('key.txt')
    })
  })

  // ==================== copy ====================
  describe('copy', () => {
    it('should delegate to store.copy', async () => {
      const store = createMockStore()
      const repo = new StorageRepository(store)

      await repo.copy('from.txt', 'to.txt')

      expect(store.copy).toHaveBeenCalledWith('from.txt', 'to.txt')
    })

    it('should fire storage:copied when hooks provided', async () => {
      const store = createMockStore()
      const hooks = createMockHooks()
      const repo = new StorageRepository(store, hooks)

      await repo.copy('from.txt', 'to.txt')

      expect(hooks.doAction).toHaveBeenCalledWith('storage:copied', {
        from: 'from.txt',
        to: 'to.txt',
      })
    })

    it('should not fire hooks when no hooks provided', async () => {
      const store = createMockStore()
      const repo = new StorageRepository(store)

      await repo.copy('from.txt', 'to.txt')

      expect(store.copy).toHaveBeenCalledWith('from.txt', 'to.txt')
    })
  })

  // ==================== move ====================
  describe('move', () => {
    it('should delegate to store.move', async () => {
      const store = createMockStore()
      const repo = new StorageRepository(store)

      await repo.move('from.txt', 'to.txt')

      expect(store.move).toHaveBeenCalledWith('from.txt', 'to.txt')
    })

    it('should fire storage:moved when hooks provided', async () => {
      const store = createMockStore()
      const hooks = createMockHooks()
      const repo = new StorageRepository(store, hooks)

      await repo.move('from.txt', 'to.txt')

      expect(hooks.doAction).toHaveBeenCalledWith('storage:moved', {
        from: 'from.txt',
        to: 'to.txt',
      })
    })

    it('should not fire hooks when no hooks provided', async () => {
      const store = createMockStore()
      const repo = new StorageRepository(store)

      await repo.move('from.txt', 'to.txt')

      expect(store.move).toHaveBeenCalledWith('from.txt', 'to.txt')
    })
  })

  // ==================== list ====================
  describe('list', () => {
    it('should yield items from store.list', async () => {
      const items = [
        { key: 'file1.txt', isDirectory: false, size: 10 },
        { key: 'file2.txt', isDirectory: false, size: 20 },
      ]
      const store = createMockStore({
        list: mock(async function* () {
          for (const item of items) {
            yield item
          }
        }),
      })
      const repo = new StorageRepository(store)

      const collected: unknown[] = []
      for await (const item of repo.list('prefix')) {
        collected.push(item)
      }

      expect(collected).toHaveLength(2)
      expect(collected[0]).toEqual(items[0])
      expect(collected[1]).toEqual(items[1])
    })

    it('should throw if store does not support list', async () => {
      const store = createMockStore({ list: undefined })
      const repo = new StorageRepository(store)

      const generator = repo.list()
      await expect(async () => {
        for await (const _item of generator) {
          // 應該在第一次迭代時拋出錯誤
        }
      }).toThrow('does not support listing')
    })

    it('should yield nothing when store.list is empty', async () => {
      const store = createMockStore({
        list: mock(async function* () {}),
      })
      const repo = new StorageRepository(store)

      const collected: unknown[] = []
      for await (const item of repo.list()) {
        collected.push(item)
      }

      expect(collected).toHaveLength(0)
    })
  })

  // ==================== listPaginated ====================
  describe('listPaginated', () => {
    it('should delegate to store.listPaginated', async () => {
      const mockResult = {
        items: [{ key: 'file.txt', isDirectory: false, size: 5 }],
        nextCursor: null,
        hasMore: false,
        count: 1,
      }
      const store = createMockStore({
        listPaginated: mock(async () => mockResult),
      })
      const repo = new StorageRepository(store)

      const result = await repo.listPaginated('prefix/', { maxResults: 10 })

      expect(result).toEqual(mockResult)
      expect(store.listPaginated).toHaveBeenCalledWith('prefix/', { maxResults: 10 })
    })

    it('should throw if store does not support listPaginated', async () => {
      const store = createMockStore({ listPaginated: undefined })
      const repo = new StorageRepository(store)

      await expect(repo.listPaginated('prefix/')).rejects.toThrow(
        'does not support paginated listing'
      )
    })
  })

  // ==================== getMetadata ====================
  describe('getMetadata', () => {
    it('should delegate to store.getMetadata', async () => {
      const metadata = {
        key: 'file.txt',
        size: 100,
        mimeType: 'text/plain',
        lastModified: new Date(),
      }
      const store = createMockStore({
        getMetadata: mock(async () => metadata),
      })
      const repo = new StorageRepository(store)

      const result = await repo.getMetadata('file.txt')

      expect(result).toEqual(metadata)
      expect(store.getMetadata).toHaveBeenCalledWith('file.txt')
    })

    it('should return null when file not found', async () => {
      const store = createMockStore({
        getMetadata: mock(async () => null),
      })
      const repo = new StorageRepository(store)

      expect(await repo.getMetadata('missing.txt')).toBeNull()
    })
  })

  // ==================== setMetadata ====================
  describe('setMetadata', () => {
    it('should delegate to store.setMetadata', async () => {
      const store = createMockStore()
      const repo = new StorageRepository(store)

      const metadata = { author: 'test', version: '1.0' }
      await repo.setMetadata('file.txt', metadata)

      expect(store.setMetadata).toHaveBeenCalledWith('file.txt', metadata)
    })

    it('should throw if store does not support setMetadata', async () => {
      const store = createMockStore({ setMetadata: undefined })
      const repo = new StorageRepository(store)

      await expect(repo.setMetadata('file.txt', { key: 'val' })).rejects.toThrow(
        'does not support metadata updates'
      )
    })
  })

  // ==================== getUrl ====================
  describe('getUrl', () => {
    it('should delegate to store.getUrl', () => {
      const store = createMockStore({
        getUrl: mock((key: string) => `/custom/${key}`),
      })
      const repo = new StorageRepository(store)

      expect(repo.getUrl('file.txt')).toBe('/custom/file.txt')
      expect(store.getUrl).toHaveBeenCalledWith('file.txt')
    })
  })

  // ==================== getSignedUrl ====================
  describe('getSignedUrl', () => {
    it('should delegate to store.getSignedUrl', async () => {
      const store = createMockStore({
        getSignedUrl: mock(async () => 'https://example.com/signed?token=abc'),
      })
      const repo = new StorageRepository(store)

      const url = await repo.getSignedUrl('file.txt', 3600)

      expect(url).toBe('https://example.com/signed?token=abc')
      expect(store.getSignedUrl).toHaveBeenCalledWith('file.txt', 3600)
    })

    it('should throw if store does not support signed URLs', async () => {
      const store = createMockStore({ getSignedUrl: undefined })
      const repo = new StorageRepository(store)

      await expect(repo.getSignedUrl('file.txt', 3600)).rejects.toThrow(
        'does not support signed URLs'
      )
    })
  })

  // ==================== putStream ====================
  describe('putStream', () => {
    it('should delegate to store.putStream', async () => {
      const store = createMockStore()
      const hooks = createMockHooks()
      const repo = new StorageRepository(store, hooks)

      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('stream data'))
          controller.close()
        },
      })

      await repo.putStream('stream.txt', stream)

      expect(store.putStream).toHaveBeenCalledWith('stream.txt', stream)
    })

    it('should fire storage:uploaded action after putStream', async () => {
      const store = createMockStore()
      const hooks = createMockHooks()
      const repo = new StorageRepository(store, hooks)

      const stream = new ReadableStream({
        start(controller) {
          controller.close()
        },
      })

      await repo.putStream('stream.txt', stream)

      expect(hooks.doAction).toHaveBeenCalledWith('storage:uploaded', { key: 'stream.txt' })
    })

    it('should throw if store does not support putStream', async () => {
      const store = createMockStore({ putStream: undefined })
      const repo = new StorageRepository(store)

      const stream = new ReadableStream({
        start(controller) {
          controller.close()
        },
      })

      await expect(repo.putStream('stream.txt', stream)).rejects.toThrow(
        'does not support stream writing'
      )
    })

    it('should not fire hooks when no hooks provided', async () => {
      const store = createMockStore()
      const repo = new StorageRepository(store)

      const stream = new ReadableStream({
        start(controller) {
          controller.close()
        },
      })

      await repo.putStream('stream.txt', stream)

      expect(store.putStream).toHaveBeenCalled()
    })
  })

  // ==================== getStream ====================
  describe('getStream', () => {
    it('should return stream from store', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data'))
          controller.close()
        },
      })
      const store = createMockStore({
        getStream: mock(async () => mockStream),
      })
      const repo = new StorageRepository(store)

      const result = await repo.getStream('file.txt')
      expect(result).toBe(mockStream)
    })

    it('should fire storage:hit when stream exists and hooks provided', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.close()
        },
      })
      const store = createMockStore({
        getStream: mock(async () => mockStream),
      })
      const hooks = createMockHooks()
      const repo = new StorageRepository(store, hooks)

      await repo.getStream('file.txt')

      expect(hooks.doAction).toHaveBeenCalledWith('storage:hit', { key: 'file.txt' })
    })

    it('should fire storage:miss when stream is null and hooks provided', async () => {
      const store = createMockStore({
        getStream: mock(async () => null),
      })
      const hooks = createMockHooks()
      const repo = new StorageRepository(store, hooks)

      await repo.getStream('missing.txt')

      expect(hooks.doAction).toHaveBeenCalledWith('storage:miss', { key: 'missing.txt' })
    })

    it('should throw if store does not support getStream', async () => {
      const store = createMockStore({ getStream: undefined })
      const repo = new StorageRepository(store)

      await expect(repo.getStream('file.txt')).rejects.toThrow('does not support stream reading')
    })

    it('should not fire hooks when no hooks provided', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.close()
        },
      })
      const store = createMockStore({
        getStream: mock(async () => mockStream),
      })
      const repo = new StorageRepository(store)

      const result = await repo.getStream('file.txt')
      expect(result).toBe(mockStream)
    })
  })
})
