import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { NATSDriver } from '../src/drivers/NATSDriver'

// Mock nats module
let shouldFailConnect = false
mock.module('nats', () => {
  const kvStored = new Map<string, Uint8Array>()
  const codec = {
    encode: (v: string) => new TextEncoder().encode(v),
    decode: (v: Uint8Array) => new TextDecoder().decode(v),
  }

  return {
    connect: async () => {
      if (shouldFailConnect) {
        throw new Error('Connect Failed')
      }
      return {
        publish: mock(() => {}),
        subscribe: mock(() => ({
          [Symbol.asyncIterator]: async function* () {
            yield {
              data: new TextEncoder().encode(JSON.stringify({ event: 'test', data: 'hello' })),
            }
          },
          unsubscribe: mock(() => {}),
        })),
        closed: async () => new Promise(() => {}), // Stay open
        close: async () => {},
        jetstream: () => ({
          views: {
            kv: async (name: string) => {
              if (name === 'ripple_presence_fail') {
                throw new Error('KV Error')
              }
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
      }
    },
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

  it('should handle subscriptions and callbacks', async () => {
    await driver.init()
    const received: any[] = []

    await driver.subscribe('chan', (event, data) => {
      received.push({ event, data })
    })

    // Verify subscription was called
    // (mock nats returns an async iterator that yields once)
    // We need to wait a tiny bit for the async loop to process the yielded value
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(received).toHaveLength(1)
    expect(received[0]).toEqual({ event: 'test', data: 'hello' })
  })

  it('should unsubscribe correctly', async () => {
    await driver.init()
    const callback = mock(() => {})

    await driver.subscribe('chan', callback)
    await driver.unsubscribe('chan')

    // Status check through internal state if possible or just verifying no errors
    expect(driver.getStatus().connected).toBe(true)
  })

  it('should throw when publishing while not initialized', async () => {
    await expect(driver.publish('chan', 'evt', {})).rejects.toThrow('NATSDriver not initialized')
  })

  it('should handle initialization failure', async () => {
    shouldFailConnect = true
    try {
      const failDriver = new NATSDriver({ servers: 'fail' })
      await expect(failDriver.init()).rejects.toThrow('Connect Failed')
    } finally {
      shouldFailConnect = false
    }
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

  it('should shutdown successfully', async () => {
    await driver.init()
    await driver.shutdown()
    expect(driver.isInitialized).toBe(false)
  })

  it('should return status', async () => {
    await driver.init()
    const status = driver.getStatus()
    expect(status.name).toBe('nats')
    expect(status.initialized).toBe(true)
  })
})
