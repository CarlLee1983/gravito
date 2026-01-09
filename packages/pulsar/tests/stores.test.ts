import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { FileSessionStore } from '../src/stores/FileSessionStore'
import { MemorySessionStore } from '../src/stores/MemorySessionStore'
import { SqliteSessionStore } from '../src/stores/SqliteSessionStore'

let tempDir = ''

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'gravito-pulsar-'))
})

afterAll(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true })
  }
})

describe('MemorySessionStore', () => {
  it('expires records based on TTL', async () => {
    let now = 1_000
    const store = new MemorySessionStore(() => now)
    await store.set('abc', { data: { foo: 'bar' }, createdAt: now, lastActivityAt: now }, 1)

    expect((await store.get('abc'))?.data.foo).toBe('bar')

    now += 2_000
    expect(await store.get('abc')).toBeNull()
  })
})

describe('FileSessionStore', () => {
  it('stores and deletes records', async () => {
    const store = new FileSessionStore(tempDir)
    await store.set('file1', { data: { foo: 'bar' }, createdAt: 0, lastActivityAt: 0 }, 10)

    const record = await store.get('file1')
    expect(record?.data.foo).toBe('bar')

    await store.delete('file1')
    expect(await store.get('file1')).toBeNull()
  })

  it('returns null for invalid json', async () => {
    const store = new FileSessionStore(tempDir)
    await writeFile(join(tempDir, 'bad.json'), '{not-json}', 'utf-8')
    expect(await store.get('bad')).toBeNull()
  })
})

describe('SqliteSessionStore', () => {
  it('stores and expires records', async () => {
    const dbPath = join(tempDir, 'sessions.sqlite')
    const store = new SqliteSessionStore(dbPath, 'sessions_test')
    await store.set('sql1', { data: { foo: 'bar' }, createdAt: 0, lastActivityAt: 0 }, 1)

    expect((await store.get('sql1'))?.data.foo).toBe('bar')

    const originalNow = Date.now
    Date.now = () => originalNow() + 2_000
    expect(await store.get('sql1')).toBeNull()
    Date.now = originalNow
  })
})

describe('RedisSessionStore', () => {
  it('serializes records and handles invalid json', async () => {
    const client = {
      get: mock(async (key: string) => {
        if (key.includes('invalid')) {
          return 'not-json'
        }
        return JSON.stringify({ data: { foo: 'bar' }, createdAt: 0, lastActivityAt: 0 })
      }),
      set: mock(async () => {}),
      del: mock(async () => {}),
    }

    mock.module('@gravito/plasma', () => ({
      Redis: {
        connection: () => client,
      },
    }))

    const { RedisSessionStore } = await import('../src/stores/RedisSessionStore')
    const store = new RedisSessionStore('session:')
    const record = await store.get('abc')
    expect(record?.data.foo).toBe('bar')
    expect(await store.get('invalid')).toBeNull()

    await store.set('abc', { data: { foo: 'bar' }, createdAt: 0, lastActivityAt: 0 }, 0)
    expect(client.set).toHaveBeenCalled()

    await store.delete('abc')
    expect(client.del).toHaveBeenCalled()
  })
})
