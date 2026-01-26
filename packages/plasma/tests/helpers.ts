import { BunRedisClient } from '../src/clients/BunRedisClient'

/**
 * Checks if Redis is available on localhost:6379
 */
export async function isRedisAvailable(): Promise<boolean> {
  const client = new BunRedisClient({
    host: 'localhost',
    port: 6379,
    maxRetries: 0,
    connectTimeout: 500,
  })

  try {
    await client.connect()
    const healthy = await client.checkHealth()
    await client.disconnect()
    return healthy
  } catch {
    return false
  }
}
