/**
 * 提供存取 RedisClient 底層連線的介面
 * @internal
 */
export interface ListCommandsContext {
  prefixKey(key: string): string
  sendCommand(command: string, args?: string[]): Promise<unknown>
}

/**
 * Redis List 指令模組
 *
 * 封裝所有 Redis 列表（List）型別的操作，
 * 包括 LPUSH、RPUSH、LPOP、RPOP、LRANGE、LLEN 等。
 *
 * @internal
 */
export class ListCommands {
  constructor(private readonly ctx: ListCommandsContext) {}

  /**
   * 從列表左端（頭部）插入一個或多個值。
   */
  async lpush(key: string, ...values: string[]): Promise<number> {
    const prefixedKey = this.ctx.prefixKey(key)
    const result = await this.ctx.sendCommand('LPUSH', [prefixedKey, ...values])
    return typeof result === 'number' ? result : Number(result)
  }

  /**
   * 從列表右端（尾部）插入一個或多個值。
   */
  async rpush(key: string, ...values: string[]): Promise<number> {
    const prefixedKey = this.ctx.prefixKey(key)
    const result = await this.ctx.sendCommand('RPUSH', [prefixedKey, ...values])
    return typeof result === 'number' ? result : Number(result)
  }

  /**
   * 移除並回傳列表的第一個元素（左端）。
   */
  async lpop(key: string): Promise<string | null> {
    const prefixedKey = this.ctx.prefixKey(key)
    const result = await this.ctx.sendCommand('LPOP', [prefixedKey])
    return result === null ? null : String(result)
  }

  /**
   * 移除並回傳列表的最後一個元素（右端）。
   */
  async rpop(key: string): Promise<string | null> {
    const prefixedKey = this.ctx.prefixKey(key)
    const result = await this.ctx.sendCommand('RPOP', [prefixedKey])
    return result === null ? null : String(result)
  }

  /**
   * 回傳列表中指定範圍的元素。
   */
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const prefixedKey = this.ctx.prefixKey(key)
    const result = await this.ctx.sendCommand('LRANGE', [prefixedKey, String(start), String(stop)])
    return Array.isArray(result) ? result.map(String) : []
  }

  /**
   * 回傳列表的元素數量。
   */
  async llen(key: string): Promise<number> {
    const prefixedKey = this.ctx.prefixKey(key)
    const result = await this.ctx.sendCommand('LLEN', [prefixedKey])
    return typeof result === 'number' ? result : Number(result)
  }

  /**
   * 回傳列表中指定索引位置的元素。
   */
  async lindex(key: string, index: number): Promise<string | null> {
    const prefixedKey = this.ctx.prefixKey(key)
    const result = await this.ctx.sendCommand('LINDEX', [prefixedKey, String(index)])
    return result === null ? null : String(result)
  }

  /**
   * 設定列表中指定索引位置的元素值。
   */
  async lset(key: string, index: number, value: string): Promise<'OK'> {
    const prefixedKey = this.ctx.prefixKey(key)
    await this.ctx.sendCommand('LSET', [prefixedKey, String(index), value])
    return 'OK'
  }

  /**
   * 移除列表中與指定值相符的元素。
   *
   * @param count - 移除的數量，正數從頭部開始，負數從尾部開始，0 移除全部。
   */
  async lrem(key: string, count: number, value: string): Promise<number> {
    const prefixedKey = this.ctx.prefixKey(key)
    const result = await this.ctx.sendCommand('LREM', [prefixedKey, String(count), value])
    return typeof result === 'number' ? result : Number(result)
  }

  /**
   * 修剪列表，只保留指定範圍內的元素。
   */
  async ltrim(key: string, start: number, stop: number): Promise<'OK'> {
    const prefixedKey = this.ctx.prefixKey(key)
    await this.ctx.sendCommand('LTRIM', [prefixedKey, String(start), String(stop)])
    return 'OK'
  }
}
