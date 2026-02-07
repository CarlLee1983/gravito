import { describe, expect, it, mock } from 'bun:test'
import { BunRedisClient } from '../src/clients/BunRedisClient'

// Mock Redis subclass
class TestEventsClient extends BunRedisClient {
  protected async getRedisClientClass(): Promise<any> {
    return class {
      connect = mock(async function (this: any) {
        this.connected = true
      })
      close = mock(async function (this: any) {
        this.connected = false
      })
      connected = false
    }
  }
}

describe('BunRedisClient Events', () => {
  it('should emit connect event', async () => {
    const client = new TestEventsClient({ host: 'localhost', port: 6379 })
    let connected = false
    client.on('connect', () => {
      connected = true
    })

    await client.connect()
    expect(connected).toBe(true)
    await client.disconnect()
  })

  it('should emit close event', async () => {
    const client = new TestEventsClient({ host: 'localhost', port: 6379 })
    let closed = false
    client.on('close', () => {
      closed = true
    })

    await client.connect()
    await client.disconnect()
    expect(closed).toBe(true)
  })
})
