import type { Account } from '../../domain/account/Account'

/**
 * Interface for Account aggregate persistence.
 * Responsible for saving and retrieving stateful account objects.
 */
export interface IAccountRepository {
  /**
   * Persists an account aggregate state.
   *
   * @param account - The account instance to save.
   */
  save(account: Account): Promise<void>

  /**
   * Retrieves an account aggregate by its unique ID.
   *
   * @param id - The account ID.
   * @returns The account instance if found, otherwise null.
   */
  findById(id: string): Promise<Account | null>

  /**
   * Retrieves all account aggregates in the repository.
   *
   * @returns An array of all account instances.
   */
  findAll(): Promise<Account[]>

  /**
   * Removes an account aggregate from the store.
   *
   * @param id - The ID of the account to delete.
   */
  delete(id: string): Promise<void>
}
