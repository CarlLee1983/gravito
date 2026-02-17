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
   * @returns Promise that resolves when save is complete
   */
  save(account: Account): Promise<void>

  /**
   * Finds an account by its unique identifier
   *
   * @param accountId - ID of the account to retrieve
   * @returns Promise resolving to the Account instance or null if not found
   */
  findById(accountId: string): Promise<Account | null>

  /**
   * Checks if an account exists in the repository
   *
   * @param accountId - ID to check
   * @returns Promise resolving to true if account exists, false otherwise
   */
  existsById(accountId: string): Promise<boolean>
}
