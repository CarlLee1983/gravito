import { Query, type QueryHandler } from '@gravito/enterprise'
import type {
  TransactionReadModel,
  TransactionRecord,
} from '../../infrastructure/projections/TransactionReadModel'

/**
 * Query to retrieve the transaction history for a specific account.
 */
export class GetTransactionHistoryQuery extends Query {
  /**
   * @param accountId - The unique identifier of the account to query history for.
   * @param limit - Maximum number of items to return (default: 20).
   * @param offset - The starting position (default: 0).
   */
  constructor(
    public readonly accountId: string,
    public readonly limit = 20,
    public readonly offset = 0
  ) {
    super()
  }
}

/**
 * Handles the logic for retrieving transaction records for an account.
 */
export class GetTransactionHistoryQueryHandler
  implements QueryHandler<GetTransactionHistoryQuery, TransactionRecord[]>
{
  constructor(private readonly transactionReadModel: TransactionReadModel) {}

  /**
   * Executes the transaction history query.
   *
   * @param query - The history query with account ID and pagination settings.
   * @returns A list of transaction records for the account.
   */
  async handle(query: GetTransactionHistoryQuery): Promise<TransactionRecord[]> {
    return this.transactionReadModel.findByAccountId(query.accountId, query.limit, query.offset)
  }
}
