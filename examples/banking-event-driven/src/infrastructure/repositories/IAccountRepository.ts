import type { Account } from '../../domain/account/Account'

/**
 * Error thrown when optimistic concurrency control detects a conflict.
 * This occurs when the account version has changed since it was last read.
 */
export class OptimisticLockError extends Error {
  constructor(
    public readonly accountId: string,
    public readonly expectedVersion: number,
    public readonly actualVersion: number
  ) {
    super(
      `Optimistic lock failed for account ${accountId}. Expected version ${expectedVersion}, but found ${actualVersion}`
    )
  }
}

/**
 * Interface for Account aggregate persistence.
 * Responsible for saving and retrieving stateful account objects.
 *
 * Implements Optimistic Concurrency Control (OCC) to detect and prevent
 * concurrent modification conflicts during concurrent transfers.
 */
export interface IAccountRepository {
  /**
   * Persists an account aggregate state.
   *
   * @param account - The account instance to save.
   * @deprecated Use `saveWithOptimisticLock` for concurrent scenarios.
   */
  save(account: Account): Promise<void>

  /**
   * Persists an account aggregate state with optimistic concurrency control.
   * Fails if the account's version has changed since last read, indicating concurrent modification.
   *
   * @param account - The account instance to save.
   * @param expectedVersion - The version number expected before this save.
   * @throws {OptimisticLockError} If the account version has changed.
   */
  saveWithOptimisticLock(account: Account, expectedVersion: number): Promise<void>

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
