import { describe, expect, it, mock } from 'bun:test'
import { AblyDriver } from '../src/drivers/AblyDriver'
import { PusherDriver } from '../src/drivers/PusherDriver'
import { RedisDriver } from '../src/drivers/RedisDriver'
import { WebSocketDriver } from '../src/drivers/WebSocketDriver'

describe('AblyDriver', () => {
  it('broadcasts via HTTP and authorizes presence channels', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = mock(async () => new Response('ok', { status: 200 }))

    const driver = new AblyDriver({ apiKey: 'key' })
    await driver.broadcast({ name: 'room', type: 'public' }, 'Event', { ok: true })

    const auth = await driver.authorizeChannel('presence-room', 'socket', '123')
    expect(auth.auth).toBe('key')
    expect(auth.channel_data).toContain('123')

    globalThis.fetch = originalFetch
  })
})

describe('PusherDriver', () => {
  it('broadcasts via HTTP and authorizes channels', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = mock(async () => new Response('ok', { status: 200 }))

    const driver = new PusherDriver({ appId: 'app', key: 'key', secret: 'secret' })
    await driver.broadcast({ name: 'room', type: 'public' }, 'Event', { ok: true })

    const auth = await driver.authorizeChannel('presence-room', 'socket-1', 'user-1')
    expect(auth.auth).toContain('key:')
    expect(auth.channel_data).toContain('user-1')

    globalThis.fetch = originalFetch
  })
})

describe('RedisDriver', () => {
  it('requires a redis client and publishes messages', async () => {
    const driver = new RedisDriver({ keyPrefix: 'test:' })

    await expect(
      driver.broadcast({ name: 'room', type: 'public' }, 'Event', { ok: true })
    ).rejects.toThrow('Redis client not set')

    const published: Array<{ channel: string; message: string }> = []
    driver.setRedisClient({
      publish: async (channel, message) => {
        published.push({ channel, message })
        return 1
      },
    })

    await driver.broadcast({ name: 'room', type: 'public' }, 'Event', { ok: true })
    expect(published[0]?.channel).toBe('test:room')
    expect(published[0]?.message).toContain('"event":"Event"')
  })
})

describe('WebSocketDriver', () => {
  it('broadcasts to open connections and ignores failures', async () => {
    const sent: string[] = []
    const connections = [
      {
        readyState: 1,
        send: (data: string) => {
          sent.push(data)
        },
        close: () => {},
      },
      {
        readyState: 0,
        send: () => {
          throw new Error('should not send')
        },
        close: () => {},
      },
      {
        readyState: 1,
        send: () => {
          throw new Error('boom')
        },
        close: () => {},
      },
    ]

    const driver = new WebSocketDriver({
      getConnections: () => connections,
      filterConnectionsByChannel: (channel) => connections.filter(() => channel === 'room'),
    })

    const originalError = console.error
    console.error = mock(() => {})

    await driver.broadcast({ name: 'room', type: 'public' }, 'Event', { ok: true })

    console.error = originalError
    expect(sent.length).toBe(1)
    expect(sent[0]).toContain('"event":"Event"')
  })
})
