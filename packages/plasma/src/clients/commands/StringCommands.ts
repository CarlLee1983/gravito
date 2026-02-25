import type { SetOptions } from '../../types'
import type { RedisClient } from '../types'

/**
 * 提供存取 RedisClient 底層連線的介面
 * @internal
 */
export interface StringCommandsContext {
  getClient(): RedisClient
  prefixKey(key: string): string
  sendCommand(command: string, args?: string[]): Promise<unknown>
  handleException(error: unknown, command?: string): Error
}

/**
 * Redis String 指令模組
 *
 * 封裝所有 Redis 字串（String）型別的操作，
 * 包括 GET、SET、MGET、MSET、INCR、DECR 等。
 *
 * @internal
 */
export class StringCommands {
  constructor(private readonly ctx: StringCommandsContext) {}

  /**
   * 取得一個 key 的值。
   *
   * @param key - 要查詢的 key。
   * @returns 字串值，若 key 不存在則回傳 null。
   */
  async get(key: string): Promise<string | null> {
    try {
      const prefixedKey = this.ctx.prefixKey(key)
      return await this.ctx.getClient().get(prefixedKey)
    } catch (error) {
      throw this.ctx.handleException(error, 'GET')
    }
  }

  /**
   * 設定一個 key 的值，支援選擇性的到期時間與條件設定。
   *
   * @param key - 要設定的 key。
   * @param value - 要儲存的字串值。
   * @param options - 可選設定，如 EX（秒）、PX（毫秒）、NX（若不存在）、XX（若存在）。
   * @returns 成功時回傳 'OK'，若條件（NX/XX）不符則回傳 null。
   */
  async set(key: string, value: string, options?: SetOptions): Promise<'OK' | null> {
    const prefixedKey = this.ctx.prefixKey(key)
    const client = this.ctx.getClient()

    const args: (string | number)[] = []
    if (options) {
      if (options.ex) {
        args.push('EX', options.ex)
      }
      if (options.px) {
        args.push('PX', options.px)
      }
      if (options.nx) {
        args.push('NX')
      }
      if (options.xx) {
        args.push('XX')
      }
    }

    if (args.length > 0) {
      try {
        const result = await client.set(prefixedKey, value, ...args)
        return result === 'OK' ? 'OK' : null
      } catch (error) {
        throw this.ctx.handleException(error, 'SET')
      }
    }

    try {
      const result = await client.set(prefixedKey, value)
      return result === 'OK' ? 'OK' : null
    } catch (error) {
      throw this.ctx.handleException(error, 'SET')
    }
  }

  /**
   * 對 key 的數值加 1。
   */
  async incr(key: string): Promise<number> {
    const prefixedKey = this.ctx.prefixKey(key)
    return await this.ctx.getClient().incr(prefixedKey)
  }

  /**
   * 對 key 的數值加上指定增量。
   */
  async incrby(key: string, increment: number): Promise<number> {
    const prefixedKey = this.ctx.prefixKey(key)
    return await this.ctx.getClient().incrby(prefixedKey, increment)
  }

  /**
   * 對 key 的數值減 1。
   */
  async decr(key: string): Promise<number> {
    const prefixedKey = this.ctx.prefixKey(key)
    return await this.ctx.getClient().decr(prefixedKey)
  }

  /**
   * 對 key 的數值減去指定減量。
   */
  async decrby(key: string, decrement: number): Promise<number> {
    const prefixedKey = this.ctx.prefixKey(key)
    return await this.ctx.getClient().decrby(prefixedKey, decrement)
  }

  /**
   * 將指定值附加到 key 的現有值後面。
   */
  async append(key: string, value: string): Promise<number> {
    const prefixedKey = this.ctx.prefixKey(key)
    const result = await this.ctx.sendCommand('APPEND', [prefixedKey, value])
    return typeof result === 'number' ? result : Number(result)
  }

  /**
   * 取得 key 對應字串值的長度。
   */
  async strlen(key: string): Promise<number> {
    const prefixedKey = this.ctx.prefixKey(key)
    const result = await this.ctx.sendCommand('STRLEN', [prefixedKey])
    return typeof result === 'number' ? result : Number(result)
  }

  /**
   * 設定 key 的新值並回傳舊值（原子操作）。
   */
  async getset(key: string, value: string): Promise<string | null> {
    const prefixedKey = this.ctx.prefixKey(key)
    const result = await this.ctx.sendCommand('GETSET', [prefixedKey, value])
    return result === null ? null : String(result)
  }

  /**
   * 批次取得多個 key 的值。
   */
  async mget(...keys: string[]): Promise<(string | null)[]> {
    const prefixedKeys = keys.map((k) => this.ctx.prefixKey(k))
    const result = await this.ctx.sendCommand('MGET', prefixedKeys)
    return Array.isArray(result) ? result.map((v) => (v === null ? null : String(v))) : []
  }

  /**
   * 批次設定多個 key-value 對。
   */
  async mset(pairs: Record<string, string>): Promise<'OK'> {
    const args: string[] = []
    for (const [key, value] of Object.entries(pairs)) {
      args.push(this.ctx.prefixKey(key), value)
    }
    await this.ctx.sendCommand('MSET', args)
    return 'OK'
  }
}
