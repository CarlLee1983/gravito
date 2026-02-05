import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LocalStore } from '../../src/stores/LocalStore'

let tempDir = ''
let store: LocalStore

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'nebula-localstore-'))
  store = new LocalStore(tempDir, '/storage')
})

afterAll(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true })
  }
})

describe('LocalStore - Basic Operations', () => {
  it('should put and get file', async () => {
    await store.put('test.txt', 'hello world')

    const data = await store.get('test.txt')
    expect(data).toBeInstanceOf(Blob)
    expect(await data?.text()).toBe('hello world')
  })

  it('should return null for non-existent file', async () => {
    const data = await store.get('non-existent.txt')
    expect(data).toBeNull()
  })

  it('should delete file', async () => {
    await store.put('delete-me.txt', 'temp')

    expect(await store.exists('delete-me.txt')).toBe(true)
    expect(await store.delete('delete-me.txt')).toBe(true)
    expect(await store.exists('delete-me.txt')).toBe(false)
  })

  it('should return false when deleting non-existent file', async () => {
    expect(await store.delete('non-existent.txt')).toBe(false)
  })

  it('should check file existence', async () => {
    await store.put('exists.txt', 'content')

    expect(await store.exists('exists.txt')).toBe(true)
    expect(await store.exists('missing.txt')).toBe(false)
  })
})

describe('LocalStore - Advanced Operations', () => {
  it('should copy file', async () => {
    await store.put('original.txt', 'original content')
    await store.copy('original.txt', 'copied.txt')

    expect(await store.exists('copied.txt')).toBe(true)
    expect(await (await store.get('copied.txt'))?.text()).toBe('original content')

    expect(await store.exists('original.txt')).toBe(true)
  })

  it('should throw when copying non-existent file', async () => {
    await expect(store.copy('non-existent.txt', 'dest.txt')).rejects.toThrow()
  })

  it('should move file', async () => {
    await store.put('source.txt', 'move me')
    await store.move('source.txt', 'destination.txt')

    expect(await store.exists('source.txt')).toBe(false)
    expect(await store.exists('destination.txt')).toBe(true)
    expect(await (await store.get('destination.txt'))?.text()).toBe('move me')
  })
})

describe('LocalStore - Metadata', () => {
  it('should get file metadata', async () => {
    await store.put('metadata.txt', 'hello world')

    const meta = await store.getMetadata('metadata.txt')

    expect(meta).toMatchObject({
      key: 'metadata.txt',
      size: 11,
      mimeType: 'text/plain',
    })
    expect(meta?.lastModified).toBeInstanceOf(Date)
  })

  it('should return null for non-existent file metadata', async () => {
    const meta = await store.getMetadata('non-existent.txt')
    expect(meta).toBeNull()
  })

  it('should guess MIME types correctly', async () => {
    const tests = [
      { key: 'file.txt', expected: 'text/plain' },
      { key: 'file.json', expected: 'application/json' },
      { key: 'file.png', expected: 'image/png' },
      { key: 'file.jpg', expected: 'image/jpeg' },
      { key: 'file.pdf', expected: 'application/pdf' },
      { key: 'file.unknown', expected: 'application/octet-stream' },
    ]

    for (const test of tests) {
      await store.put(test.key, 'content')
      const meta = await store.getMetadata(test.key)
      expect(meta?.mimeType).toBe(test.expected)
    }
  })
})

describe('LocalStore - URL Generation', () => {
  it('should generate correct URLs', () => {
    expect(store.getUrl('file.txt')).toBe('/storage/file.txt')
    expect(store.getUrl('dir/file.txt')).toBe('/storage/dir/file.txt')
  })
})

describe('LocalStore - list (not implemented)', () => {
  it('should throw "not yet implemented" error when calling list()', () => {
    expect(() => store.list()).toThrow('[LocalStore] list() is not yet implemented.')
  })

  it('should throw "not yet implemented" error when calling list() with prefix', () => {
    expect(() => store.list('some/prefix')).toThrow('[LocalStore] list() is not yet implemented.')
  })
})

describe('LocalStore - Nested Directories', () => {
  it('should handle nested directory structures', async () => {
    await store.put('deep/nested/dir/file.txt', 'deep content')

    expect(await store.exists('deep/nested/dir/file.txt')).toBe(true)
    expect(await (await store.get('deep/nested/dir/file.txt'))?.text()).toBe('deep content')
  })
})
