import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { RedisClient } from '../src/RedisClient'

// Mock ioredis
const mockIORedisInstance: any = {
  connect: mock(async () => {}),
  quit: mock(async () => {}),
  ping: mock(async () => 'PONG'),
  get: mock(async () => 'val'),
  set: mock(async () => 'OK'),
  del: mock(async () => 1),
  incr: mock(async () => 1),
  hget: mock(async () => 'v'),
  hset: mock(async () => 1),
  lpush: mock(async () => 1),
  sadd: mock(async () => 1),
  zadd: mock(async () => 1),
  on: mock(() => {}),
  duplicate: mock(() => mockIORedisInstance),
  pipeline: mock(() => ({
    get: mock(() => {}),
    exec: mock(async () => [[null, 'val']]),
  })),
  call: mock(async () => 'OK'), // For the .call('SET', ...) method
}

const MockIORedis = {
  default: class {
    constructor() {
      Object.assign(this, mockIORedisInstance)
    }
  },
}

describe('RedisClient (ioredis wrapper)', () => {
  let client: RedisClient

  beforeEach(() => {
    client = new RedisClient({ host: 'localhost' })
    // biome-ignore lint/suspicious/noExplicitAny: Mocking
    ;(client as any).ioredis = MockIORedis
    ;(client as any).connected = true
    ;(client as any).client = mockIORedisInstance
  })

  it('should ping', async () => {
    expect(await client.ping()).toBe('PONG')
  })

  it('should check health', async () => {
    expect(await client.checkHealth()).toBe(true)
  })

  it('should get string', async () => {
    expect(await client.get('k')).toBe('val')
  })

  it('should set string (using call)', async () => {
    expect(await client.set('k', 'v')).toBe('OK')
  })

  it('should incr', async () => {
    expect(await client.incr('k')).toBe(1)
  })

  it('should handle hashes', async () => {
    expect(await client.hget('k', 'f')).toBe('v')
    expect(await client.hset('k', 'f', 'v')).toBe(1)
  })

  it('should handle lists', async () => {
    expect(await client.lpush('k', 'v')).toBe(1)
  })

  it('should handle pipeline', async () => {
    const p = client.pipeline()
    p.get('k')
    const res = await p.exec()
    expect(res).toEqual([[null, 'val']])
  })
})
