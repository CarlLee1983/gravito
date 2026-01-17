import { describe, expect, it } from 'bun:test'
import { BunRedisClient } from '../src/clients/BunRedisClient'

describe('BunRedisClient Events', () => {
  it('should emit connect event', async () => {
    const client = new BunRedisClient({ host: 'localhost', port: 6379 })
    let connected = false
    client.on('connect', () => {
      connected = true
    })

    await client.connect()
    expect(connected).toBe(true)
    await client.disconnect()
  })

  it('should emit close event', async () => {
    const client = new BunRedisClient({ host: 'localhost', port: 6379 })
    let closed = false
    client.on('close', () => {
      closed = true
    })

    await client.connect()
    await client.disconnect()
    expect(closed).toBe(true)
  })
})
