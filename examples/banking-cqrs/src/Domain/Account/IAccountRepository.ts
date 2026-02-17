import type { Account } from './Account'

/**
 * Account Repository Interface
 *
 * Defines the contract for persisting and retrieving Account aggregates.
 * Implementations should handle database operations and aggregate reconstruction.
 *
 * @since 1.0.0
 */
export interface IAccountRepository {
  /**
   * Persists an account aggregate to the storage
   *
   * @param account - The account instance to save
   * @param trx - Optional database transaction object for atomicity
   * @returns Promise that resolves when save is complete
   */
  save(account: Account, trx?: any): Promise<void>

  /**
   * Finds an account by its unique identifier
   *
   * @param accountId - ID of the account to retrieve
   * @param trx - Optional database transaction object
   * @returns Promise resolving to the Account instance or null if not found
   */
  findById(accountId: string, trx?: any): Promise<Account | null>

  /**
   * Checks if an account exists in the repository
   *
   * @param accountId - ID to check
   * @param trx - Optional database transaction object
   * @returns Promise resolving to true if account exists, false otherwise
   */
  existsById(accountId: string, trx?: any): Promise<boolean>
}
