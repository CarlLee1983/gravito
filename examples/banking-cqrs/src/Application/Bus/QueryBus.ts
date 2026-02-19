import type { Container } from '@gravito/core'
import type { Query, QueryHandler } from '@gravito/enterprise'
import type { QueryCache } from '../Cache/QueryCache'

/**
 * Query Bus - Central dispatcher for read operations
 *
 * Implements the CQRS pattern by routing queries to their corresponding handlers.
 * This bus uses the Gravito Container's dependency injection to resolve handlers
 * based on a naming convention: `cqrs.query.{QueryClassName}`
 *
 * **CQRS Concept:**
 * Queries represent **requests to read state** from the system.
 * Queries are read-only operations that return DTOs (Data Transfer Objects)
 * without modifying any aggregates or publishing events.
 *
 * **Key Differences from Commands:**
 * | Aspect | Query | Command |
 * |--------|-------|---------|
 * | Purpose | Read data | Modify state |
 * | Result | Returns data (DTO) | Usually void (or ID) |
 * | Side Effects | None | Publishes events |
 * | Aggregate | Queries don't load aggregates | Loads and modifies |
 * | Caching | Can be cached safely | No caching |
 *
 * **快取機制（可選）:**
 * 若注入 QueryCache，execute() 會自動：
 * 1. 以 `{QueryClassName}:{JSON.stringify(query)}` 為鍵查詢快取
 * 2. 命中則直接回傳，不執行 handler
 * 3. 未命中則執行 handler 並將結果存入快取
 * 未注入時行為與原本相同（向後相容）。
 *
 * **Naming Convention:**
 * Handlers are registered in the Container with keys like:
 * - `cqrs.query.GetAccountBalanceQuery` → GetAccountBalanceHandler
 * - `cqrs.query.GetAccountDetailsQuery` → GetAccountDetailsHandler
 * - `cqrs.query.GetTransactionHistoryQuery` → GetTransactionHistoryHandler
 *
 * **Execution Flow（含快取）:**
 * ```
 * Controller
 *   ↓ (creates query)
 * QueryBus.execute()
 *   ↓ (check cache hit?)
 * QueryCache.get(cacheKey)
 *   ↓ (miss: resolves handler)
 * Container.make(handlerKey)
 *   ↓ (queries database)
 * QueryHandler.handle()
 *   ↓ (store in cache)
 * QueryCache.set(cacheKey, result)
 *   ↓ (returns DTO)
 * Controller
 * ```
 *
 * @example
 * ```typescript
 * const queryBus = container.make('cqrs.queryBus')
 *
 * const query = new GetAccountBalanceQuery(accountId)
 * const balance = await queryBus.execute<AccountBalanceDTO>(query)
 *
 * console.log(balance.currency)  // 'TWD'
 * console.log(balance.dollars)   // 1000.50
 * ```
 *
 * @since 1.0.0
 */
export class QueryBus {
  /**
   * Constructor
   *
   * @param container - Gravito IoC container for handler resolution
   * @param cache - 可選的查詢快取；提供後 execute() 自動快取結果
   */
  constructor(
    private container: Container,
    private cache?: QueryCache
  ) {}

  /**
   * Executes a query and returns the result
   *
   * This method implements the core CQRS query dispatch pattern:
   * 1. （若有 QueryCache）以 Query 名稱與參數產生快取鍵，並嘗試命中快取
   * 2. Derives handler key from query class name
   * 3. Resolves handler from container using naming convention
   * 4. Invokes handler with the query
   * 5. （若有 QueryCache）將結果存入快取
   * 6. Returns handler result (always a DTO)
   *
   * **Characteristics:**
   * - Read-only operation (no side effects)
   * - 命中快取時不執行 handler，顯著降低資料庫負擔
   * - May query multiple data sources (not just aggregates)
   * - Returns data transfer objects for response serialization
   *
   * **Error Handling:**
   * - If handler is not registered: throws "not found" error from container
   * - If query fails: error propagates up to controller/service layer
   * - No transaction management needed (read-only)
   *
   * **Generic Type Parameter:**
   * TResult specifies the return type, typically a DTO class:
   * - `AccountBalanceDTO` - account balance information
   * - `AccountDetailsDTO` - full account details
   * - `TransactionHistoryDTO[]` - list of transactions
   *
   * @template TResult - Return type from the query handler (DTO)
   * @param query - Query instance to execute
   * @returns Promise resolving to the query result (DTO)
   * @throws Error if handler is not registered or query execution fails
   *
   * @example
   * ```typescript
   * // Query returning single DTO
   * const balanceQuery = new GetAccountBalanceQuery(accountId)
   * const balance = await queryBus.execute<AccountBalanceDTO>(balanceQuery)
   * return { success: true, data: balance }
   *
   * // Query returning DTO array
   * const historyQuery = new GetTransactionHistoryQuery(accountId, { limit: 10 })
   * const transactions = await queryBus.execute<TransactionHistoryDTO[]>(historyQuery)
   * return { success: true, data: transactions, total: transactions.length }
   * ```
   */
  async execute<TResult>(query: Query): Promise<TResult> {
    // 若有快取，先嘗試命中快取
    if (this.cache) {
      const cacheKey = `${query.constructor.name}:${JSON.stringify(query)}`
      const cached = this.cache.get<TResult>(cacheKey)
      if (cached !== undefined) {
        return cached
      }

      // 快取未命中，執行 handler
      const handlerKey = `cqrs.query.${query.constructor.name}`
      const handler = this.container.make<QueryHandler<Query, TResult>>(handlerKey)
      const result = await handler.handle(query)

      // 將結果存入快取
      this.cache.set(cacheKey, result)
      return result
    }

    // 無快取：直接執行（向後相容）
    const handlerKey = `cqrs.query.${query.constructor.name}`
    const handler = this.container.make<QueryHandler<Query, TResult>>(handlerKey)
    return handler.handle(query)
  }

  /**
   * 使快取失效
   *
   * Command 執行後呼叫此方法，確保後續 Query 取得最新資料。
   *
   * @param queryName - 指定 Query 類別名稱時，只刪除該 Query 的快取（前綴匹配）；
   *                    省略時清除所有快取
   *
   * @example
   * ```typescript
   * // 只讓 GetAccountBalance 相關快取失效
   * queryBus.invalidateCache('GetAccountBalanceQuery')
   *
   * // 清除所有快取（例如重大資料變更後）
   * queryBus.invalidateCache()
   * ```
   */
  invalidateCache(queryName?: string): void {
    if (!this.cache) {
      return
    }

    if (queryName) {
      this.cache.invalidateByPrefix(queryName)
    } else {
      this.cache.clear()
    }
  }
}
