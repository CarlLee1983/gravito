import { BunRedisClient } from '../src/clients/BunRedisClient'

/**
 * 檢查 Redis 是否可用
 * 支持通過環境變數配置：REDIS_HOST、REDIS_PORT
 */
export async function isRedisAvailable(): Promise<boolean> {
  const client = new BunRedisClient({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
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
