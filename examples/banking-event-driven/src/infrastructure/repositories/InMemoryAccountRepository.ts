import type { Account } from '../../domain/account/Account'
import type { IAccountRepository } from './IAccountRepository'

/**
 * In-memory implementation of the IAccountRepository.
 * Useful for development and testing environments where persistence is not required.
 */
export class InMemoryAccountRepository implements IAccountRepository {
  /** Internal storage using a Map for quick lookup. */
  private readonly store = new Map<string, Account>()

  /**
   * Saves the account aggregate in the in-memory store.
   *
   * @param account - The account instance to persist.
   */
  async save(account: Account): Promise<void> {
    this.store.set(account.id, account)
  }

  /**
   * Retrieves an account instance from the in-memory store.
   *
   * @param id - The unique account ID.
   * @returns The account instance or null if not found.
   */
  async findById(id: string): Promise<Account | null> {
    return this.store.get(id) ?? null
  }

  /**
   * Returns all account instances stored in memory.
   *
   * @returns An array of all account instances.
   */
  async findAll(): Promise<Account[]> {
    return Array.from(this.store.values())
  }

  /**
   * Removes an account from the in-memory store.
   *
   * @param id - The ID of the account to delete.
   */
  async delete(id: string): Promise<void> {
    this.store.delete(id)
  }
}
