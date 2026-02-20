/**
 * 查詢快取
 *
 * 為 QueryBus 提供輕量級的記憶體快取層，避免重複執行相同查詢。
 * 支援 TTL（Time-To-Live）過期機制與前綴批量失效。
 *
 * **設計原則：**
 * - 純記憶體快取（Map）：O(1) 讀寫，無外部依賴
 * - 惰性過期：get() 時才檢查 TTL，不使用定時器
 * - 不可變快取值：外部無法直接修改快取條目
 * - 向後相容：不注入時 QueryBus 行為與原本相同
 *
 * **快取鍵格式：**
 * `{QueryClassName}:{JSON.stringify(queryParams)}`
 *
 * 例：`GetAccountBalanceQuery:{"accountId":"ACC-001"}`
 *
 * @example
 * ```typescript
 * const cache = new QueryCache(30_000) // 30 秒 TTL
 *
 * // 手動操作
 * cache.set('MyQuery:{}', result)
 * cache.get('MyQuery:{}') // result（若未過期）
 *
 * // 批量失效
 * cache.invalidateByPrefix('GetAccountBalanceQuery')
 * ```
 *
 * @since 1.0.0
 */

/**
 * 快取條目內部結構（唯讀）
 */
interface CacheEntry<T> {
  /** 快取的值 */
  readonly value: T
  /** 過期時間戳（毫秒，Date.now() 格式） */
  readonly expiresAt: number
}

export class QueryCache {
  /** 快取儲存（key → entry） */
  private readonly cache = new Map<string, CacheEntry<unknown>>()

  /** 預設 TTL（毫秒） */
  private readonly defaultTtlMs: number

  /**
   * Constructor
   *
   * @param defaultTtlMs - 預設 TTL（毫秒），預設 30 秒
   */
  constructor(defaultTtlMs = 30_000) {
    this.defaultTtlMs = defaultTtlMs
  }

  /**
   * 取得快取值
   *
   * 若 key 不存在或已過期，回傳 undefined 並自動移除過期條目。
   *
   * @template T - 快取值的型別
   * @param key - 快取鍵
   * @returns 快取值或 undefined（未命中或已過期）
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key)

    if (entry === undefined) {
      return undefined
    }

    // 惰性過期：取值時才檢查 TTL
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return undefined
    }

    return entry.value as T
  }

  /**
   * 設定快取值
   *
   * @template T - 快取值的型別
   * @param key - 快取鍵
   * @param value - 要快取的值
   * @param ttlMs - 自訂 TTL（毫秒），省略時使用 defaultTtlMs
   */
  set<T>(key: string, value: T, ttlMs?: number): void {
    const effectiveTtl = ttlMs ?? this.defaultTtlMs
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + effectiveTtl,
    }
    this.cache.set(key, entry)
  }

  /**
   * 刪除單一快取條目
   *
   * @param key - 要刪除的快取鍵
   */
  invalidate(key: string): void {
    this.cache.delete(key)
  }

  /**
   * 依前綴批量刪除快取條目
   *
   * 適用於 Command 執行後讓相關 Query 快取失效。
   * 例：執行 DepositFundsCommand 後，
   * invalidateByPrefix('GetAccountBalanceQuery') 使所有帳戶餘額快取失效。
   *
   * @param prefix - 要匹配的鍵前綴
   */
  invalidateByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * 清除所有快取條目
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 取得目前快取的條目數（包含已過期但尚未惰性清除的條目）
   *
   * @returns 快取條目數
   */
  size(): number {
    return this.cache.size
  }
}
