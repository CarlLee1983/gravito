import type { Query } from '@gravito/enterprise'

/**
 * Get Account Details Query
 *
 * Represents a request for full account information.
 *
 * @since 1.0.0
 */
export class GetAccountDetailsQuery implements Query {
  /**
   * Constructor
   *
   * @param accountId - Target account identifier
   */
  constructor(readonly accountId: string) {}
}
