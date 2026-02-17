import type { QueryHandler } from '@gravito/enterprise'
import type { ITransactionRepository } from '../../../Domain/Transaction/ITransactionRepository'
import type { GetTransactionHistoryQuery } from './GetTransactionHistoryQuery'
import type { TransactionDTO, TransactionHistoryDTO } from './TransactionHistoryDTO'

/**
 * Get Transaction History Query Handler
 *
 * Fetches transaction records for a specific account with pagination support.
 *
 * @implements {QueryHandler<GetTransactionHistoryQuery, TransactionHistoryDTO>}
 * @since 1.0.0
 */
export class GetTransactionHistoryHandler
  implements QueryHandler<GetTransactionHistoryQuery, TransactionHistoryDTO>
{
  /**
   * Constructor
   *
   * @param repository - Transaction repository
   */
  constructor(private repository: ITransactionRepository) {}

  /**
   * Handles the request for transaction history
   *
   * @param query - Pagination and account parameters
   * @returns Paginated history DTO
   */
  async handle(query: GetTransactionHistoryQuery): Promise<TransactionHistoryDTO> {
    const transactions = await this.repository.findByAccountId(
      query.accountId,
      query.limit,
      query.offset
    )
    const total = await this.repository.countByAccountId(query.accountId)

    const transactionDTOs: TransactionDTO[] = transactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amountCents: tx.amount,
      amountDollars: tx.amount / 100,
      balanceAfterCents: tx.balanceAfter,
      balanceAfterDollars: tx.balanceAfter / 100,
      currency: tx.currency,
      referenceId: tx.referenceId,
      description: tx.description,
      createdAt: tx.createdAt,
    }))

    return {
      accountId: query.accountId,
      transactions: transactionDTOs,
      total,
      limit: query.limit,
      offset: query.offset,
    }
  }
}
