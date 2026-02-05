import { describe, expect, it } from 'bun:test'
import { MemoryStore } from '../../src/stores/MemoryStore'

describe('MemoryStore - Basic Operations', () => {
  it('should put and get string data', async () => {
    const store = new MemoryStore()
    await store.put('test.txt', 'hello world')

    const result = await store.get('test.txt')
    expect(result).toBeInstanceOf(Blob)
    expect(await result?.text()).toBe('hello world')
  })

  it('should put and get Blob data', async () => {
    const store = new MemoryStore()
    const blob = new Blob(['blob content'], { type: 'text/plain' })
    await store.put('blob.txt', blob)

    const result = await store.get('blob.txt')
    expect(await result?.text()).toBe('blob content')
  })

  it('should put and get Buffer data', async () => {
    const store = new MemoryStore()
    const buffer = Buffer.from('buffer content')
    await store.put('buffer.txt', buffer)

    const result = await store.get('buffer.txt')
    expect(await result?.text()).toBe('buffer content')
  })

  it('should return null for non-existent key', async () => {
    const store = new MemoryStore()
    expect(await store.get('non-existent')).toBeNull()
  })

  it('should delete existing file', async () => {
    const store = new MemoryStore()
    await store.put('delete-me.txt', 'content')

    expect(await store.delete('delete-me.txt')).toBe(true)
    expect(await store.get('delete-me.txt')).toBeNull()
  })

  it('should return false when deleting non-existent file', async () => {
    const store = new MemoryStore()
    expect(await store.delete('non-existent')).toBe(false)
  })

  it('should check file existence', async () => {
    const store = new MemoryStore()

    expect(await store.exists('file.txt')).toBe(false)
    await store.put('file.txt', 'content')
    expect(await store.exists('file.txt')).toBe(true)
  })
})

describe('MemoryStore - Copy & Move', () => {
  it('should copy file', async () => {
    const store = new MemoryStore()
    await store.put('original.txt', 'original content')

    await store.copy('original.txt', 'copied.txt')

    expect(await store.exists('original.txt')).toBe(true)
    expect(await store.exists('copied.txt')).toBe(true)
    expect(await (await store.get('copied.txt'))?.text()).toBe('original content')
  })

  it('should throw when copying non-existent file', async () => {
    const store = new MemoryStore()

    await expect(store.copy('non-existent.txt', 'dest.txt')).rejects.toThrow(
      '[MemoryStore] Source file not found: non-existent.txt'
    )
  })

  it('should move file', async () => {
    const store = new MemoryStore()
    await store.put('source.txt', 'move me')

    await store.move('source.txt', 'dest.txt')

    expect(await store.exists('source.txt')).toBe(false)
    expect(await store.exists('dest.txt')).toBe(true)
    expect(await (await store.get('dest.txt'))?.text()).toBe('move me')
  })

  it('should throw when moving non-existent file', async () => {
    const store = new MemoryStore()

    await expect(store.move('non-existent.txt', 'dest.txt')).rejects.toThrow(
      '[MemoryStore] Source file not found: non-existent.txt'
    )
  })

  it('should update lastModified on copy', async () => {
    const store = new MemoryStore()
    await store.put('original.txt', 'content')

    await new Promise((resolve) => setTimeout(resolve, 10))

    await store.copy('original.txt', 'copied.txt')

    const originalMeta = await store.getMetadata('original.txt')
    const copiedMeta = await store.getMetadata('copied.txt')

    expect(copiedMeta?.lastModified?.getTime()).toBeGreaterThanOrEqual(
      originalMeta?.lastModified?.getTime() ?? 0
    )
  })
})

describe('MemoryStore - list (async generator)', () => {
  it('should list all files', async () => {
    const store = new MemoryStore()
    await store.put('a.txt', 'a')
    await store.put('b.txt', 'b')
    await store.put('c.txt', 'c')

    const items: { key: string }[] = []
    for await (const item of store.list()) {
      items.push(item)
    }

    expect(items).toHaveLength(3)
    expect(items.map((i) => i.key)).toContain('a.txt')
    expect(items.map((i) => i.key)).toContain('b.txt')
    expect(items.map((i) => i.key)).toContain('c.txt')
  })

  it('should filter by prefix', async () => {
    const store = new MemoryStore()
    await store.put('images/a.jpg', 'img-a')
    await store.put('images/b.jpg', 'img-b')
    await store.put('docs/readme.md', 'readme')

    const items: { key: string }[] = []
    for await (const item of store.list('images/')) {
      items.push(item)
    }

    expect(items).toHaveLength(2)
    expect(items.every((i) => i.key.startsWith('images/'))).toBe(true)
  })

  it('should yield nothing for empty store', async () => {
    const store = new MemoryStore()

    const items: unknown[] = []
    for await (const item of store.list()) {
      items.push(item)
    }

    expect(items).toHaveLength(0)
  })

  it('should yield nothing when no files match prefix', async () => {
    const store = new MemoryStore()
    await store.put('a.txt', 'a')

    const items: unknown[] = []
    for await (const item of store.list('nonexistent/')) {
      items.push(item)
    }

    expect(items).toHaveLength(0)
  })

  it('should yield items with correct shape', async () => {
    const store = new MemoryStore()
    await store.put('file.txt', 'hello world')

    for await (const item of store.list()) {
      expect(item.key).toBe('file.txt')
      expect(item.isDirectory).toBe(false)
      expect(item.size).toBe(11)
      expect(item.lastModified).toBeInstanceOf(Date)
    }
  })

  it('should list with empty string prefix (all files)', async () => {
    const store = new MemoryStore()
    await store.put('x.txt', 'x')
    await store.put('y.txt', 'y')

    const items: unknown[] = []
    for await (const item of store.list('')) {
      items.push(item)
    }

    expect(items).toHaveLength(2)
  })
})

describe('MemoryStore - URL & Metadata', () => {
  it('should generate correct URL', () => {
    const store = new MemoryStore()
    expect(store.getUrl('file.txt')).toBe('/memory/file.txt')
    expect(store.getUrl('dir/file.txt')).toBe('/memory/dir/file.txt')
  })

  it('should return null metadata for non-existent file', async () => {
    const store = new MemoryStore()
    expect(await store.getMetadata('missing.txt')).toBeNull()
  })

  it('should return correct metadata structure', async () => {
    const store = new MemoryStore()
    await store.put('meta.txt', 'test content', {
      contentType: 'text/plain',
      metadata: { version: '1' },
    })

    const meta = await store.getMetadata('meta.txt')
    expect(meta).toMatchObject({
      key: 'meta.txt',
      size: 12,
      mimeType: 'text/plain',
    })
    expect(meta?.lastModified).toBeInstanceOf(Date)
    expect(meta?.customMetadata).toEqual({ version: '1' })
  })

  it('should use default mimeType when not specified', async () => {
    const store = new MemoryStore()
    await store.put('data.bin', Buffer.from([1, 2, 3]))

    const meta = await store.getMetadata('data.bin')
    expect(meta?.mimeType).toBe('application/octet-stream')
  })
})

describe('MemoryStore - Overwrite behavior', () => {
  it('should overwrite existing file', async () => {
    const store = new MemoryStore()
    await store.put('file.txt', 'original')
    await store.put('file.txt', 'updated')

    const result = await store.get('file.txt')
    expect(await result?.text()).toBe('updated')
  })

  it('should update size on overwrite', async () => {
    const store = new MemoryStore()
    await store.put('file.txt', 'short')
    await store.put('file.txt', 'this is a longer string')

    const meta = await store.getMetadata('file.txt')
    expect(meta?.size).toBe(23)
  })
})
