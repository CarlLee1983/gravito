import type { QueryHandler } from '@gravito/enterprise'
import type { IAccountRepository } from '../../../Domain/Account/IAccountRepository'
import type { AccountBalanceDTO } from './AccountBalanceDTO'
import type { GetAccountBalanceQuery } from './GetAccountBalanceQuery'

/**
 * Get Account Balance Query Handler
 *
 * Implements the business logic for retrieving account balance information.
 * This handler is called by QueryBus when GetAccountBalanceQuery is executed.
 *
 * **Execution Flow:**
 * ```
 * QueryBus.execute(GetAccountBalanceQuery)
 *   → GetAccountBalanceHandler.handle()
 *     1. Load account aggregate from repository
 *     2. Check account exists (throw if not)
 *     3. Extract balance and status into DTO
 *     4. Return DTO for serialization
 * ```
 *
 * **Characteristics:**
 * - Read-only operation (no side effects)
 * - No domain events published
 * - Safe to cache by accountId
 * - No transaction needed
 *
 * **Error Handling:**
 * - Throws if account not found
 * - Repository errors propagate to caller
 *
 * **Dependencies:**
 * - IAccountRepository: for loading account data
 *
 * @implements {QueryHandler<GetAccountBalanceQuery, AccountBalanceDTO>}
 *
 * @example
 * ```typescript
 * const handler = new GetAccountBalanceHandler(repository)
 * const query = new GetAccountBalanceQuery('acc-123')
 * const dto = await handler.handle(query)
 * // Returns: AccountBalanceDTO with current balance
 * ```
 *
 * @since 1.0.0
 */
export class GetAccountBalanceHandler
  implements QueryHandler<GetAccountBalanceQuery, AccountBalanceDTO>
{
  /**
   * Constructor
   *
   * @param repository - Account repository for data loading
   */
  constructor(private repository: IAccountRepository) {}

  /**
   * Handles the GetAccountBalanceQuery
   *
   * **Preconditions:**
   * - Account must exist in database
   *
   * **Side Effects:**
   * - None (read-only)
   *
   * **Result:**
   * Returns AccountBalanceDTO containing:
   * - accountId, ownerName (identification)
   * - balanceCents, balanceDollars (both representations)
   * - currency (for formatting)
   * - status (active/frozen/closed)
   * - createdAt (metadata)
   *
   * @param query - GetAccountBalanceQuery with accountId
   * @returns Promise resolving to AccountBalanceDTO
   * @throws Error if account not found
   *
   * @example
   * ```typescript
   * const query = new GetAccountBalanceQuery('acc-123')
   * const balance = await handler.handle(query)
   * // Returns: { accountId, ownerName, balanceCents, balanceDollars, currency, status, createdAt }
   * ```
   */
  async handle(query: GetAccountBalanceQuery): Promise<AccountBalanceDTO> {
    const account = await this.repository.findById(query.accountId)
    if (!account) {
      throw new Error(`帳戶 ${query.accountId} 不存在`)
    }

    return {
      accountId: account.id,
      ownerName: account.ownerName,
      balanceCents: account.balance.cents,
      balanceDollars: account.balance.dollars,
      currency: account.balance.currency,
      status: account.status,
      createdAt: account.createdAt,
    }
  }
}
