import { describe, expect, it } from 'bun:test'
import { NullStore } from '../../src/stores/NullStore'

describe('NullStore', () => {
  describe('put', () => {
    it('should complete without error (no-op)', async () => {
      const store = new NullStore()
      // put 是 no-op，不應拋出錯誤
      await expect(store.put('any-key', 'any-data')).resolves.toBeUndefined()
    })

    it('should accept Blob data without error', async () => {
      const store = new NullStore()
      const blob = new Blob(['blob content'], { type: 'text/plain' })
      await expect(store.put('blob-key', blob)).resolves.toBeUndefined()
    })

    it('should accept Buffer data without error', async () => {
      const store = new NullStore()
      const buffer = Buffer.from('buffer content')
      await expect(store.put('buffer-key', buffer)).resolves.toBeUndefined()
    })

    it('should not actually store any data', async () => {
      const store = new NullStore()
      await store.put('stored-key', 'stored-data')
      const result = await store.get('stored-key')
      expect(result).toBeNull()
    })
  })

  describe('get', () => {
    it('should always return null', async () => {
      const store = new NullStore()
      expect(await store.get('any-key')).toBeNull()
    })

    it('should return null for empty key', async () => {
      const store = new NullStore()
      expect(await store.get('')).toBeNull()
    })

    it('should return null even after put', async () => {
      const store = new NullStore()
      await store.put('key', 'value')
      expect(await store.get('key')).toBeNull()
    })
  })

  describe('delete', () => {
    it('should always return false', async () => {
      const store = new NullStore()
      expect(await store.delete('any-key')).toBe(false)
    })

    it('should return false for empty key', async () => {
      const store = new NullStore()
      expect(await store.delete('')).toBe(false)
    })
  })

  describe('exists', () => {
    it('should always return false', async () => {
      const store = new NullStore()
      expect(await store.exists('any-key')).toBe(false)
    })

    it('should return false even after put', async () => {
      const store = new NullStore()
      await store.put('key', 'value')
      expect(await store.exists('key')).toBe(false)
    })
  })

  describe('copy', () => {
    it('should complete without error (no-op)', async () => {
      const store = new NullStore()
      await expect(store.copy('from', 'to')).resolves.toBeUndefined()
    })
  })

  describe('move', () => {
    it('should complete without error (no-op)', async () => {
      const store = new NullStore()
      await expect(store.move('from', 'to')).resolves.toBeUndefined()
    })
  })

  describe('list', () => {
    it('should yield nothing', async () => {
      const store = new NullStore()
      const items: unknown[] = []
      for await (const item of store.list()) {
        items.push(item)
      }
      expect(items).toHaveLength(0)
    })

    it('should yield nothing with prefix', async () => {
      const store = new NullStore()
      const items: unknown[] = []
      for await (const item of store.list('some-prefix')) {
        items.push(item)
      }
      expect(items).toHaveLength(0)
    })
  })

  describe('getMetadata', () => {
    it('should always return null', async () => {
      const store = new NullStore()
      expect(await store.getMetadata('any-key')).toBeNull()
    })

    it('should return null even after put', async () => {
      const store = new NullStore()
      await store.put('key', 'value')
      expect(await store.getMetadata('key')).toBeNull()
    })
  })

  describe('getUrl', () => {
    it('should return /null/ prefixed URL', () => {
      const store = new NullStore()
      expect(store.getUrl('file.txt')).toBe('/null/file.txt')
    })

    it('should handle nested paths', () => {
      const store = new NullStore()
      expect(store.getUrl('dir/subdir/file.txt')).toBe('/null/dir/subdir/file.txt')
    })

    it('should handle empty key', () => {
      const store = new NullStore()
      expect(store.getUrl('')).toBe('/null/')
    })
  })
})
