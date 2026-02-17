import type { Transaction } from './Transaction'

/**
 * Transaction Repository Interface
 *
 * Defines the contract for persisting and querying transaction records.
 * Unlike account repository which is for domain logic, this is often used for read models.
 *
 * @since 1.0.0
 */
export interface ITransactionRepository {
  /**
   * Persists a transaction record
   *
   * @param transaction - The transaction record to save
   * @returns Promise resolving when save is complete
   */
  save(transaction: Transaction): Promise<void>

  /**
   * Retrieves transaction history for an account with pagination
   *
   * @param accountId - ID of the account
   * @param limit - Maximum number of records to return (optional)
   * @param offset - Number of records to skip (optional)
   * @returns Promise resolving to an array of Transaction records
   */
  findByAccountId(accountId: string, limit?: number, offset?: number): Promise<Transaction[]>

  /**
   * Counts the total number of transactions for an account
   *
   * @param accountId - ID of the account
   * @returns Promise resolving to the total count
   */
  countByAccountId(accountId: string): Promise<number>
}
