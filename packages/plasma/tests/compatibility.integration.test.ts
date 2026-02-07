import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { BunRedisClient } from '../src/clients/BunRedisClient'
import { RedisClient } from '../src/RedisClient'
import type { RedisClientContract, RedisConfig } from '../src/types'
import { isRedisAvailable } from './helpers'

const REDIS_HOST = process.env.REDIS_HOST || 'localhost'
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379

const clients = [
  {
    name: 'BunRedisClient',
    create: (config: RedisConfig) => new BunRedisClient(config),
  },
  {
    name: 'RedisClient (ioredis)',
    create: (config: RedisConfig) => new RedisClient(config),
  },
]

describe('Compatibility Suite', () => {
  // Shared test logic
  const testClient = (name: string, create: (config: RedisConfig) => RedisClientContract) => {
    const client = create({
      host: REDIS_HOST,
      port: REDIS_PORT,
    })

    describe(name, () => {
      beforeAll(async () => {
        if (!(await isRedisAvailable())) {
          return
        }

        try {
          await client.connect()
          await client.flushall()
        } catch {
          // ignore connection errors if service up but connect failed
        }
      })

      afterAll(async () => {
        if (client.isConnected()) {
          await client.disconnect()
        }
      })

      it('should normalize exists return to number', async () => {
        if (!client.isConnected()) {
          return
        }
        await client.set('c:exists', '1')
        const exists = await client.exists('c:exists')
        expect(exists).toBe(1)
        expect(typeof exists).toBe('number')

        const notExists = await client.exists('c:missing')
        expect(notExists).toBe(0)
        expect(typeof notExists).toBe('number')
      })

      it('should return null for get on missing key', async () => {
        if (!client.isConnected()) {
          return
        }
        const val = await client.get('c:missing_get')
        expect(val).toBeNull()
      })

      it('should handle hgetall return types consistently', async () => {
        if (!client.isConnected()) {
          return
        }
        await client.hset('c:hash', { f1: 'v1' })
        const all = await client.hgetall('c:hash')
        expect(all).toEqual({ f1: 'v1' })

        // Empty hash (or missing key behaving as empty hash)
        const missing = await client.hgetall('c:hash_missing')
        expect(missing).toEqual({})
      })

      it('should handle zrange return types consistently', async () => {
        if (!client.isConnected()) {
          return
        }
        await client.zadd('c:zset', { score: 10, member: 'm1' })

        const res = await client.zrange('c:zset', 0, -1)
        expect(Array.isArray(res)).toBe(true)
        expect(res).toEqual(['m1'])

        const resScores = await client.zrange('c:zset', 0, -1, { withScores: true })
        expect(Array.isArray(resScores)).toBe(true)
        // Expect flat array [member, score, member, score]
        expect(resScores).toEqual(['m1', '10'])
      })

      it('should format pipeline results consistently', async () => {
        if (!client.isConnected()) {
          return
        }
        const pipe = client.pipeline()
        pipe.set('c:p1', 'v1')
        pipe.get('c:p1')
        pipe.get('c:p_missing')

        const results = await pipe.exec()
        // Expect [[err, result], [err, result], ...]
        expect(results).toHaveLength(3)

        // set -> OK
        expect(results[0][0]).toBeNull()
        expect(results[0][1]).toBe('OK')

        // get -> v1
        expect(results[1][0]).toBeNull()
        expect(results[1][1]).toBe('v1')

        // get missing -> null
        expect(results[2][0]).toBeNull()
        expect(results[2][1]).toBeNull()
      })
    })
  }

  for (const c of clients) {
    testClient(c.name, c.create)
  }
})
