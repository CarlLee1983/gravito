import type { RedisClient } from '../types'

/**
 * 提供存取 RedisClient 底層連線的介面
 * @internal
 */
export interface HashCommandsContext {
  getClient(): RedisClient
  prefixKey(key: string): string
  sendCommand(command: string, args?: string[]): Promise<unknown>
  existsToNumber(result: boolean): number
}

/**
 * Redis Hash 指令模組
 *
 * 封裝所有 Redis 雜湊（Hash）型別的操作，
 * 包括 HGET、HSET、HMGET、HMSET、HGETALL、HDEL 等。
 *
 * @internal
 */
export class HashCommands {
  constructor(private readonly ctx: HashCommandsContext) {}

  /**
   * 取得雜湊中指定欄位的值。
   */
  async hget(key: string, field: string): Promise<string | null> {
    const prefixedKey = this.ctx.prefixKey(key)
    return await this.ctx.getClient().hget(prefixedKey, field)
  }

  /**
   * 設定雜湊中一個或多個欄位的值。
   *
   * @param key - 雜湊的 key。
   * @param fieldOrData - 單一欄位名稱（搭配 value 使用），或欄位-值的物件對。
   * @param value - 當 fieldOrData 為字串時，對應的欄位值。
   * @returns 新增的欄位數量。
   */
  async hset(
    key: string,
    fieldOrData: string | Record<string, string>,
    value?: string
  ): Promise<number> {
    const prefixedKey = this.ctx.prefixKey(key)
    const client = this.ctx.getClient()

    if (typeof fieldOrData === 'string' && value !== undefined) {
      return await client.hset(prefixedKey, fieldOrData, value)
    }

    const data = fieldOrData as Record<string, string>
    const entries = Object.entries(data)
    if (entries.length === 0) {
      return 0
    }

    // Bun.redis hset 可能支援物件，若不支援則退回 HMSET
    try {
      const result = await client.hset(prefixedKey, data)
      return typeof result === 'number' ? result : Number(result)
    } catch {
      const args: string[] = []
      for (const [field, val] of entries) {
        args.push(field, val)
      }
      const result = await this.ctx.sendCommand('HMSET', [prefixedKey, ...args])
      return typeof result === 'number' ? result : Number(result)
    }
  }

  /**
   * 刪除雜湊中的一個或多個欄位。
   */
  async hdel(key: string, ...fields: string[]): Promise<number> {
    const prefixedKey = this.ctx.prefixKey(key)
    return await this.ctx.getClient().hdel(prefixedKey, ...fields)
  }

  /**
   * 確認雜湊中指定欄位是否存在。
   */
  async hexists(key: string, field: string): Promise<number> {
    const prefixedKey = this.ctx.prefixKey(key)
    const result = await this.ctx.sendCommand('HEXISTS', [prefixedKey, field])
    if (typeof result === 'boolean') {
      return this.ctx.existsToNumber(result)
    }
    return typeof result === 'number' ? result : Number(result)
  }

  /**
   * 取得雜湊中所有欄位與值。
   */
  async hgetall(key: string): Promise<Record<string, string>> {
    const prefixedKey = this.ctx.prefixKey(key)
    return await this.ctx.getClient().hgetall(prefixedKey)
  }

  /**
   * 對雜湊中指定數值欄位進行加法運算。
   */
  async hincrby(key: string, field: string, increment: number): Promise<number> {
    const prefixedKey = this.ctx.prefixKey(key)
    return await this.ctx.getClient().hincrby(prefixedKey, field, increment)
  }

  /**
   * 取得雜湊中所有欄位名稱。
   */
  async hkeys(key: string): Promise<string[]> {
    const prefixedKey = this.ctx.prefixKey(key)
    const result = await this.ctx.sendCommand('HKEYS', [prefixedKey])
    return Array.isArray(result) ? result.map(String) : []
  }

  /**
   * 取得雜湊中所有欄位的值。
   */
  async hvals(key: string): Promise<string[]> {
    const prefixedKey = this.ctx.prefixKey(key)
    const result = await this.ctx.sendCommand('HVALS', [prefixedKey])
    return Array.isArray(result) ? result.map(String) : []
  }

  /**
   * 取得雜湊中的欄位數量。
   */
  async hlen(key: string): Promise<number> {
    const prefixedKey = this.ctx.prefixKey(key)
    const result = await this.ctx.sendCommand('HLEN', [prefixedKey])
    return typeof result === 'number' ? result : Number(result)
  }

  /**
   * 批次取得雜湊中多個欄位的值。
   */
  async hmget(key: string, ...fields: string[]): Promise<(string | null)[]> {
    const prefixedKey = this.ctx.prefixKey(key)
    return await this.ctx.getClient().hmget(prefixedKey, ...fields)
  }

  /**
   * 批次設定雜湊中多個欄位的值（HMSET 的別名）。
   */
  async hmset(key: string, data: Record<string, string>): Promise<'OK'> {
    const prefixedKey = this.ctx.prefixKey(key)
    const args: string[] = []
    for (const [field, value] of Object.entries(data)) {
      args.push(field, value)
    }
    await this.ctx.sendCommand('HMSET', [prefixedKey, ...args])
    return 'OK'
  }
}
