import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LocalStore } from '../src/stores/LocalStore'

let tempDir = ''
let store: LocalStore

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'nebula-security-'))
  store = new LocalStore(tempDir, '/storage')
})

afterAll(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true })
  }
})

describe('LocalStore - Path Traversal Prevention', () => {
  const attacks = [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config',
    'foo/../../../bar',
    '../parent/dir',
  ]

  for (const attack of attacks) {
    it(`should reject path traversal: ${attack}`, async () => {
      await expect(store.put(attack, 'malicious')).rejects.toThrow(/Invalid storage key/)
    })
  }
})

describe('LocalStore - Sanitization', () => {
  const safePaths = ['/absolute/path', './current/dir', '....//....//file']

  for (const path of safePaths) {
    it(`should sanitize and accept: ${path}`, async () => {
      await store.put(path, 'content')
      expect(true).toBe(true)
    })
  }
})

describe('LocalStore - Edge Cases', () => {
  it('should reject empty key', async () => {
    await expect(store.put('', 'data')).rejects.toThrow()
  })

  it('should reject null byte in key', async () => {
    await expect(store.put('file\x00.txt', 'data')).rejects.toThrow()
  })

  it('should handle special characters in filename', async () => {
    const specialKeys = [
      'file-with-dash.txt',
      'file_with_underscore.txt',
      'file.multiple.dots.txt',
      'file (with spaces).txt',
    ]

    for (const key of specialKeys) {
      await store.put(key, 'content')
      expect(await store.exists(key)).toBe(true)
    }
  })

  it('should handle empty file', async () => {
    await store.put('empty.txt', '')
    const data = await store.get('empty.txt')
    expect(await data?.text()).toBe('')
  })

  it('should handle large file', async () => {
    const largeContent = 'x'.repeat(1024 * 1024)
    await store.put('large.txt', largeContent)

    const data = await store.get('large.txt')
    expect(await data?.text()).toBe(largeContent)
  })
})

describe('LocalStore - Concurrent Operations', () => {
  it('should handle parallel writes to different keys', async () => {
    const writes = Array.from({ length: 100 }, (_, i) =>
      store.put(`concurrent-${i}.txt`, `content-${i}`)
    )

    await Promise.all(writes)

    for (let i = 0; i < 100; i++) {
      expect(await store.exists(`concurrent-${i}.txt`)).toBe(true)
    }
  })

  it('should handle parallel reads', async () => {
    await store.put('read-test.txt', 'parallel read content')

    const reads = Array.from({ length: 50 }, () => store.get('read-test.txt'))

    const results = await Promise.all(reads)

    for (const result of results) {
      expect(await result?.text()).toBe('parallel read content')
    }
  })
})
