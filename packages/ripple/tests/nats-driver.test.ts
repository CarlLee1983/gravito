import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { NATSDriver } from '../src/drivers/NATSDriver'

// Mock nats module
mock.module('nats', () => {
  const kvStored = new Map<string, Uint8Array>()
  const codec = {
    encode: (v: string) => new TextEncoder().encode(v),
    decode: (v: Uint8Array) => new TextDecoder().decode(v),
  }

  return {
    connect: async () => ({
      publish: mock(() => {}),
      subscribe: mock(() => ({
        [Symbol.asyncIterator]: async function* () {
          yield { data: new TextEncoder().encode(JSON.stringify({ event: 'test', data: 'hello' })) }
        },
      })),
      closed: async () => new Promise(() => {}), // Stay open
      close: async () => {},
      jetstream: () => ({
        views: {
          kv: async (name: string) => {
            if (name === 'ripple_presence_fail') throw new Error('KV Error')
            return {
              put: mock(async (key: string, value: Uint8Array) => {
                kvStored.set(`${name}:${key}`, value)
              }),
              get: mock(async (key: string) => {
                const val = kvStored.get(`${name}:${key}`)
                return val ? { value: val } : null
              }),
              delete: mock(async (key: string) => {
                kvStored.delete(`${name}:${key}`)
              }),
              keys: mock(async function* () {
                for (const k of kvStored.keys()) {
                  if (k.startsWith(`${name}:`)) {
                    yield k.split(':')[1]
                  }
                }
              }),
            }
          },
        },
        StringCodec: () => codec,
      }),
    }),
    JSONCodec: () => ({
      encode: (v: any) => new TextEncoder().encode(JSON.stringify(v)),
      decode: (v: Uint8Array) => JSON.parse(new TextDecoder().decode(v)),
    }),
    jetstream: () => ({
      StringCodec: () => codec,
    }),
  }
})

describe('NATSDriver', () => {
  let driver: NATSDriver

  beforeEach(() => {
    driver = new NATSDriver({
      servers: 'nats://localhost:4222',
    })
  })

  it('should initialize successfully', async () => {
    await driver.init()
    expect(driver.isInitialized).toBe(true)
    expect(driver.getStatus().connected).toBe(true)
  })

  it('should have correct name', () => {
    expect(driver.name).toBe('nats')
  })

  it('should publish messages', async () => {
    await driver.init()
    await expect(driver.publish('chan', 'evt', { ok: 1 })).resolves.toBeUndefined()
  })

  it('should track and retrieve presence members', async () => {
    await driver.init()

    const userInfo = {
      id: 'user-123',
      info: { name: 'Test User', status: 'online' },
    }

    // Track a presence member
    await driver.trackPresence('test-channel', userInfo)

    // Retrieve presence members
    const members = await driver.getPresenceMembers('test-channel')
    expect(members).toHaveLength(1)
    expect(members[0]).toEqual(userInfo)
  })

  it('should handle untracking presence members', async () => {
    await driver.init()

    const userInfo = { id: 'user-456', info: {} }
    await driver.trackPresence('test-channel', userInfo)

    let members = await driver.getPresenceMembers('test-channel')
    expect(members.some((m) => m.id === 'user-456')).toBe(true)

    // Untrack
    await driver.untrackPresence('test-channel', 'user-456')

    members = await driver.getPresenceMembers('test-channel')
    expect(members.some((m) => m.id === 'user-456')).toBe(false)
  })

  it('should handle KV errors gracefully', async () => {
    await driver.init()

    // getPresenceMembers should return empty array on KV error (e.g. bucket not found)
    const members = await driver.getPresenceMembers('non-existent')
    expect(members).toEqual([])

    // trackPresence should throw RippleDriverError if KV creation fails
    await expect(driver.trackPresence('fail', { id: 1, info: {} })).rejects.toThrow(
      'Failed to track presence'
    )
  })
})
