import type { Container } from '@gravito/core'
import type { Query, QueryHandler } from '@gravito/enterprise'

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
 * **Naming Convention:**
 * Handlers are registered in the Container with keys like:
 * - `cqrs.query.GetAccountBalanceQuery` → GetAccountBalanceHandler
 * - `cqrs.query.GetAccountDetailsQuery` → GetAccountDetailsHandler
 * - `cqrs.query.GetTransactionHistoryQuery` → GetTransactionHistoryHandler
 *
 * **Execution Flow:**
 * ```
 * Controller
 *   ↓ (creates query)
 * QueryBus.execute()
 *   ↓ (resolves handler)
 * Container.make(handlerKey)
 *   ↓ (queries database/cache)
 * QueryHandler.handle()
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
   */
  constructor(private container: Container) {}

  /**
   * Executes a query and returns the result
   *
   * This method implements the core CQRS query dispatch pattern:
   * 1. Derives handler key from query class name
   * 2. Resolves handler from container using naming convention
   * 3. Invokes handler with the query
   * 4. Returns handler result (always a DTO)
   *
   * **Characteristics:**
   * - Read-only operation (no side effects)
   * - Can be cached by query type and parameters
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
    const handlerKey = `cqrs.query.${query.constructor.name}`
    const handler = this.container.make<QueryHandler<Query, TResult>>(handlerKey)
    return handler.handle(query)
  }
}
