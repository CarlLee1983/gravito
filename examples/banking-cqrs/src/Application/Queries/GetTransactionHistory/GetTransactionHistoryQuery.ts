import type { Query } from '@gravito/enterprise'

/**
 * Get Transaction History Query
 *
 * Represents a request for paginated account transaction history.
 *
 * @since 1.0.0
 */
export class GetTransactionHistoryQuery implements Query {
  /**
   * Constructor
   *
   * @param accountId - Target account identifier
   * @param limit - Max number of records (default: 10)
   * @param offset - Pagination offset (default: 0)
   */
  constructor(
    readonly accountId: string,
    readonly limit: number = 10,
    readonly offset: number = 0
  ) {}
}
