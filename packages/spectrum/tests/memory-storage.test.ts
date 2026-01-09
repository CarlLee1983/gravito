import { describe, expect, test } from 'bun:test'
import { MemoryStorage } from '../src/storage/MemoryStorage'

describe('MemoryStorage', () => {
  test('stores and retrieves requests, logs, and queries', async () => {
    const storage = new MemoryStorage()
    await storage.init()

    await storage.storeRequest({ id: 'r1' } as any)
    await storage.storeLog({ id: 'l1' } as any)
    await storage.storeQuery({ id: 'q1' } as any)

    expect(await storage.getRequest('r1')).toEqual({ id: 'r1' })
    expect((await storage.getRequests())[0]?.id).toBe('r1')
    expect((await storage.getLogs())[0]?.id).toBe('l1')
    expect((await storage.getQueries())[0]?.id).toBe('q1')
  })

  test('prunes to max items', async () => {
    const storage = new MemoryStorage()
    await storage.storeRequest({ id: 'r1' } as any)
    await storage.storeRequest({ id: 'r2' } as any)

    await storage.prune(1)
    const requests = await storage.getRequests()
    expect(requests.length).toBe(1)
  })

  test('clears stored data', async () => {
    const storage = new MemoryStorage()
    await storage.storeRequest({ id: 'r1' } as any)
    await storage.clear()
    expect(await storage.getRequests()).toEqual([])
  })
})
