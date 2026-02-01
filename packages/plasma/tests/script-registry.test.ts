import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { RedisManager } from '../src/RedisManager'
import { isRedisAvailable } from './helpers'

describe('ScriptRegistry', () => {
  let manager: RedisManager
  let available: boolean

  beforeAll(async () => {
    available = await isRedisAvailable()
    if (available) {
      manager = new RedisManager()
      manager.configure({
        connections: {
          default: { host: 'localhost', port: 6379 },
        },
      })
      await manager.connectAll()
    }
  })

  afterAll(async () => {
    if (available) {
      await manager.disconnectAll()
    }
  })

  it('should register and execute scripts with auto-SHA1', async () => {
    if (!available) return

    const scripts = manager.scripts()

    // Register a simple echo script
    // Using a random suffix to ensure unique SHA1 and trigger fallback logic
    const uniqueVal = Math.random().toString(36)
    const scriptSrc = `return ARGV[1] .. "${uniqueVal}"`
    scripts.register('echo_unique', scriptSrc)

    const def = scripts.get('echo_unique')
    expect(def).toBeDefined()
    expect(def?.sha1).toBeDefined()

    // Execute - should work (fallback to EVAL on first run)
    const result1 = await scripts.execute('echo_unique', [], ['hello'])
    expect(result1).toBe(`hello${uniqueVal}`)

    // Execute again - should use EVALSHA (how to verify? implementation detail, but result should be same)
    const result2 = await scripts.execute('echo_unique', [], ['world'])
    expect(result2).toBe(`world${uniqueVal}`)
  })

  it('should handle number of keys correctly', async () => {
    if (!available) return

    const scripts = manager.scripts()

    // Register a script that uses a key
    scripts.register('getkey', 'return redis.call("GET", KEYS[1])')

    await manager.getDefault().set('test:script', 'value123')

    const result = await scripts.execute('getkey', ['test:script'])
    expect(result).toBe('value123')
  })

  it('should throw error for unregistered scripts', async () => {
    if (!available) return
    const scripts = manager.scripts()
    expect(scripts.execute('non_existent')).rejects.toThrow('not registered')
  })
})
