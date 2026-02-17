import type { Query } from '@gravito/enterprise'

/**
 * Get Account Balance Query
 *
 * Represents a request to retrieve the current balance of an account.
 * Queries are immutable data transfer objects that describe read-only operations.
 *
 * **CQRS Pattern:**
 * This query encapsulates the intent to fetch account balance.
 * The actual business logic is in GetAccountBalanceHandler, which:
 * 1. Loads the account from repository
 * 2. Extracts balance and currency information
 * 3. Returns as AccountBalanceDTO for serialization
 *
 * **Key Difference from Commands:**
 * - No side effects or state changes
 * - Can be cached by accountId
 * - Read-only operation
 * - Returns data transfer object (DTO)
 *
 * **Naming Convention:**
 * The handler for this query is registered as:
 * `cqrs.query.GetAccountBalanceQuery` in the Container
 *
 * @example
 * ```typescript
 * const query = new GetAccountBalanceQuery('acc-123')
 * const balanceDto = await queryBus.execute<AccountBalanceDTO>(query)
 * // Returns: { accountId, currency, dollars, cents }
 * ```
 *
 * @since 1.0.0
 */
export class GetAccountBalanceQuery implements Query {
  /**
   * Constructor
   *
   * @param accountId - Account ID to query balance for
   */
  constructor(readonly accountId: string) {}
}
