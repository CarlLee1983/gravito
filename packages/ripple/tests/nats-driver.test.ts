import { describe, expect, it, mock, beforeEach } from 'bun:test'
import { NATSDriver } from '../src/drivers/NATSDriver'

// Mock nats module
mock.module('nats', () => {
    return {
        connect: async () => ({
            publish: mock(() => { }),
            subscribe: mock(() => ({
                [Symbol.asyncIterator]: async function* () {
                    yield { data: new TextEncoder().encode(JSON.stringify({ event: 'test', data: 'hello' })) }
                }
            })),
            closed: async () => new Promise(() => { }), // Stay open
            close: async () => { }
        }),
        JSONCodec: () => ({
            encode: (v: any) => new TextEncoder().encode(JSON.stringify(v)),
            decode: (v: Uint8Array) => JSON.parse(new TextDecoder().decode(v))
        })
    }
})

describe('NATSDriver', () => {
    let driver: NATSDriver

    beforeEach(() => {
        driver = new NATSDriver({
            servers: 'nats://localhost:4222'
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

    it('should handle presence tracking (placeholder)', async () => {
        await driver.init()
        // Currently returns empty array as it's a placeholder in alpha
        const members = await driver.getPresenceMembers('test')
        expect(members).toEqual([])
    })
})
