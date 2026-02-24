import type { ZAddOptions, ZRangeOptions } from '../../types'
import type { RedisClient } from '../types'

/**
 * 提供存取 RedisClient 底層連線的介面
 * @internal
 */
export interface SetCommandsContext {
  getClient(): RedisClient
  prefixKey(key: string): string
  sendCommand(command: string, args?: string[]): Promise<unknown>
  handleException(error: unknown, command?: string): Error
  existsToNumber(result: boolean): number
}

/**
 * Redis Set 與 Sorted Set 指令模組
 *
 * 封裝所有 Redis 集合（Set）與有序集合（Sorted Set）型別的操作，
 * 包括 SADD、SREM、SMEMBERS、ZADD、ZRANGE 等。
 *
 * @internal
 */
export class SetCommands {
  constructor(private readonly ctx: SetCommandsContext) {}

  // ============================================================================
  // Set 操作
  // ============================================================================

  /**
   * 將一個或多個成員加入集合。
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      const prefixedKey = this.ctx.prefixKey(key)
      return await this.ctx.getClient().sadd(prefixedKey, ...members)
    } catch (error) {
      throw this.ctx.handleException(error, 'SADD')
    }
  }

  /**
   * 從集合中移除一個或多個成員。
   */
  async srem(key: string, ...members: string[]): Promise<number> {
    try {
      const prefixedKey = this.ctx.prefixKey(key)
      return await this.ctx.getClient().srem(prefixedKey, ...members)
    } catch (error) {
      throw this.ctx.handleException(error, 'SREM')
    }
  }

  /**
   * 回傳集合中所有成員。
   */
  async smembers(key: string): Promise<string[]> {
    try {
      const prefixedKey = this.ctx.prefixKey(key)
      return await this.ctx.getClient().smembers(prefixedKey)
    } catch (error) {
      throw this.ctx.handleException(error, 'SMEMBERS')
    }
  }

  /**
   * 確認指定成員是否存在於集合中。
   */
  async sismember(key: string, member: string): Promise<number> {
    try {
      const prefixedKey = this.ctx.prefixKey(key)
      const result = await this.ctx.getClient().sismember(prefixedKey, member)
      return typeof result === 'number' ? result : this.ctx.existsToNumber(result as boolean)
    } catch (error) {
      throw this.ctx.handleException(error, 'SISMEMBER')
    }
  }

  /**
   * 回傳集合的成員數量。
   */
  async scard(key: string): Promise<number> {
    const prefixedKey = this.ctx.prefixKey(key)
    const result = await this.ctx.sendCommand('SCARD', [prefixedKey])
    return typeof result === 'number' ? result : Number(result)
  }

  /**
   * 移除並回傳集合中隨機的一個或多個成員。
   */
  async spop(key: string, count?: number): Promise<string | string[] | null> {
    const prefixedKey = this.ctx.prefixKey(key)
    if (count !== undefined) {
      const result = await this.ctx.sendCommand('SPOP', [prefixedKey, String(count)])
      if (Array.isArray(result)) {
        return result.map(String)
      }
      return result === null ? null : String(result)
    }

    try {
      const result = await this.ctx.getClient().spop(prefixedKey)
      return result === null ? null : String(result)
    } catch (error) {
      throw this.ctx.handleException(error, 'SPOP')
    }
  }

  /**
   * 回傳集合中隨機的一個或多個成員（不移除）。
   */
  async srandmember(key: string, count?: number): Promise<string | string[] | null> {
    const prefixedKey = this.ctx.prefixKey(key)
    const result =
      count !== undefined
        ? await this.ctx.sendCommand('SRANDMEMBER', [prefixedKey, String(count)])
        : await this.ctx.sendCommand('SRANDMEMBER', [prefixedKey])

    if (Array.isArray(result)) {
      return result.map(String)
    }
    return result === null ? null : String(result)
  }

  /**
   * 回傳多個集合的聯集。
   */
  async sunion(...keys: string[]): Promise<string[]> {
    const prefixedKeys = keys.map((k) => this.ctx.prefixKey(k))
    const result = await this.ctx.sendCommand('SUNION', prefixedKeys)
    return Array.isArray(result) ? result.map(String) : []
  }

  /**
   * 回傳多個集合的交集。
   */
  async sinter(...keys: string[]): Promise<string[]> {
    const prefixedKeys = keys.map((k) => this.ctx.prefixKey(k))
    const result = await this.ctx.sendCommand('SINTER', prefixedKeys)
    return Array.isArray(result) ? result.map(String) : []
  }

  /**
   * 回傳多個集合的差集（第一個集合減去其餘集合的成員）。
   */
  async sdiff(...keys: string[]): Promise<string[]> {
    const prefixedKeys = keys.map((k) => this.ctx.prefixKey(k))
    const result = await this.ctx.sendCommand('SDIFF', prefixedKeys)
    return Array.isArray(result) ? result.map(String) : []
  }

  // ============================================================================
  // Sorted Set 操作
  // ============================================================================

  /**
   * 將一個或多個帶分數的成員加入有序集合。
   */
  async zadd(key: string, ...items: ZAddOptions[]): Promise<number> {
    const prefixedKey = this.ctx.prefixKey(key)
    const args: string[] = []
    for (const item of items) {
      args.push(String(item.score), item.member)
    }
    const result = await this.ctx.sendCommand('ZADD', [prefixedKey, ...args])
    return typeof result === 'number' ? result : Number(result)
  }

  /**
   * 從有序集合中移除一個或多個成員。
   */
  async zrem(key: string, ...members: string[]): Promise<number> {
    const prefixedKey = this.ctx.prefixKey(key)
    const result = await this.ctx.sendCommand('ZREM', [prefixedKey, ...members])
    return typeof result === 'number' ? result : Number(result)
  }

  /**
   * 回傳有序集合中指定成員的分數。
   */
  async zscore(key: string, member: string): Promise<string | null> {
    const prefixedKey = this.ctx.prefixKey(key)
    const result = await this.ctx.sendCommand('ZSCORE', [prefixedKey, member])
    return result === null ? null : String(result)
  }

  /**
   * 回傳有序集合中指定成員的排名（由低到高）。
   */
  async zrank(key: string, member: string): Promise<number | null> {
    const prefixedKey = this.ctx.prefixKey(key)
    const result = await this.ctx.sendCommand('ZRANK', [prefixedKey, member])
    return result === null ? null : Number(result)
  }

  /**
   * 回傳有序集合中指定成員的排名（由高到低）。
   */
  async zrevrank(key: string, member: string): Promise<number | null> {
    const prefixedKey = this.ctx.prefixKey(key)
    const result = await this.ctx.sendCommand('ZREVRANK', [prefixedKey, member])
    return result === null ? null : Number(result)
  }

  /**
   * 回傳有序集合中指定範圍的成員（由低到高排列）。
   */
  async zrange(
    key: string,
    start: number,
    stop: number,
    options?: ZRangeOptions
  ): Promise<string[]> {
    const prefixedKey = this.ctx.prefixKey(key)
    const args: string[] = [prefixedKey, String(start), String(stop)]

    if (options?.withScores) {
      args.push('WITHSCORES')
    }

    const result = await this.ctx.sendCommand('ZRANGE', args)

    if (options?.withScores && Array.isArray(result)) {
      return result.flat().map(String)
    }

    return Array.isArray(result) ? result.map(String) : []
  }

  /**
   * 回傳有序集合中指定範圍的成員（由高到低排列）。
   */
  async zrevrange(
    key: string,
    start: number,
    stop: number,
    options?: ZRangeOptions
  ): Promise<string[]> {
    const prefixedKey = this.ctx.prefixKey(key)
    const args: string[] = [prefixedKey, String(start), String(stop)]

    if (options?.withScores) {
      args.push('WITHSCORES')
    }

    const result = await this.ctx.sendCommand('ZREVRANGE', args)

    if (options?.withScores && Array.isArray(result)) {
      return result.flat().map(String)
    }

    return Array.isArray(result) ? result.map(String) : []
  }

  /**
   * 回傳有序集合的成員數量。
   */
  async zcard(key: string): Promise<number> {
    const prefixedKey = this.ctx.prefixKey(key)
    const result = await this.ctx.sendCommand('ZCARD', [prefixedKey])
    return typeof result === 'number' ? result : Number(result)
  }

  /**
   * 回傳有序集合中分數在指定範圍內的成員數量。
   */
  async zcount(key: string, min: number | string, max: number | string): Promise<number> {
    const prefixedKey = this.ctx.prefixKey(key)
    const result = await this.ctx.sendCommand('ZCOUNT', [prefixedKey, String(min), String(max)])
    return typeof result === 'number' ? result : Number(result)
  }

  /**
   * 對有序集合中指定成員的分數進行加法運算。
   */
  async zincrby(key: string, increment: number, member: string): Promise<string> {
    const prefixedKey = this.ctx.prefixKey(key)
    const result = await this.ctx.sendCommand('ZINCRBY', [prefixedKey, String(increment), member])
    return String(result)
  }
}
