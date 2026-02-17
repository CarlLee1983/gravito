import { DB } from '@gravito/atlas'
import { Account } from '../../Domain/Account/Account'
import type { AccountStatus } from '../../Domain/Account/AccountStatus'
import type { IAccountRepository } from '../../Domain/Account/IAccountRepository'
import { Money } from '../../Domain/Shared/Money'

/**
 * Account Repository Implementation using Atlas ORM
 *
 * Provides persistence layer for Account aggregates using the Gravito Atlas database facade.
 * Implements the Repository pattern for decoupling domain logic from data access concerns.
 *
 * **Responsibilities:**
 * - Load accounts from database into domain aggregate
 * - Persist account state changes back to database
 * - Check account existence
 *
 * **Database Schema (SQLite):**
 * ```sql
 * CREATE TABLE accounts (
 *   id TEXT PRIMARY KEY,
 *   owner_name TEXT NOT NULL,
 *   balance INTEGER NOT NULL DEFAULT 0,        -- stored in cents
 *   currency TEXT NOT NULL DEFAULT 'TWD',
 *   status TEXT NOT NULL DEFAULT 'active',
 *   created_at TEXT NOT NULL,
 *   updated_at TEXT NOT NULL
 * )
 * ```
 *
 * **Implementation Notes:**
 * - Balance is stored as integer (cents) to avoid floating-point precision errors
 * - Timestamps use ISO string format in SQLite
 * - Type assertions (`as any`) are used due to Atlas QueryBuilder returning `unknown` type
 *
 * @implements {IAccountRepository}
 *
 * @example
 * ```typescript
 * const repository = new AtlasAccountRepository()
 * const account = await repository.findById(accountId)
 * if (account) {
 *   account.deposit(amount)
 *   await repository.save(account)
 * }
 * ```
 *
 * @since 1.0.0
 */
export class AtlasAccountRepository implements IAccountRepository {
  /**
   * Saves an account aggregate to the database
   *
   * Implements insert-or-update (upsert) logic:
   * - If account exists: updates balance, status, and updated_at
   * - If new account: inserts all fields (id, owner_name, balance, currency, status, timestamps)
   *
   * **Data Mapping:**
   * - Account.balance (Money) → balance (cents as integer)
   * - Currency preserved for validation and formatting
   * - Timestamps converted to ISO string format
   *
   * **Preconditions:**
   * - Account.id must be a valid UUID
   * - Account.balance.currency must be set
   * - Account.balance must be non-negative (enforced by Money ValueObject)
   *
   * **Side Effects:**
   * - Creates or updates row in accounts table
   * - Sets updated_at to current timestamp
   *
   * @param account - Account aggregate to persist
   * @throws Database error if insert/update fails (e.g., constraint violation)
   *
   * @example
   * ```typescript
   * const account = Account.create(id, 'John Doe', 'TWD')
   * account.deposit(Money.fromDollars(1000, 'TWD'))
   * await repository.save(account)
   * // Account now persisted in database
   * ```
   */
  async save(account: Account, trx?: any): Promise<void> {
    // Use transaction if provided, otherwise use DB directly
    const queryBuilder = trx ? trx.table('accounts') : DB.table('accounts')

    const existing = (await queryBuilder.where('id', account.id).first()) as any

    if (existing) {
      await queryBuilder.where('id', account.id).update({
        balance: account.balance.cents,
        status: account.status,
        updated_at: new Date().toISOString(),
      })
    } else {
      await queryBuilder.insert({
        id: account.id,
        owner_name: account.ownerName,
        balance: account.balance.cents,
        currency: account.balance.currency,
        status: account.status,
        created_at: account.createdAt.toISOString(),
        updated_at: account.updatedAt.toISOString(),
      })
    }
  }

  /**
   * Loads an account aggregate from the database by ID
   *
   * Reconstructs the Account aggregate from persisted database row.
   * This is called by command and query handlers to work with existing accounts.
   *
   * **Data Reconstruction:**
   * - Reads row from accounts table
   * - Reconstructs Money ValueObject from balance (cents) and currency
   * - Rebuilds Account aggregate with all properties
   * - Returns null if account not found
   *
   * **Type Safety:**
   * - Query result typed as `any` (Atlas limitation)
   * - Each field individually type-asserted during reconstruction
   * - AccountStatus enum values must match database values
   *
   * @param accountId - Account ID (UUID) to load
   * @returns Promise resolving to Account instance or null if not found
   * @throws Database error if query fails
   *
   * @example
   * ```typescript
   * const account = await repository.findById('acc-123')
   * if (!account) {
   *   throw new NotFoundError('Account not found')
   * }
   * account.deposit(amount)
   * ```
   */
  async findById(accountId: string, trx?: any): Promise<Account | null> {
    const queryBuilder = trx ? trx.table('accounts') : DB.table('accounts')
    const row = (await queryBuilder.where('id', accountId).first()) as any

    if (!row) return null

    return new Account(
      row.id as string,
      row.owner_name as string,
      new Money(row.balance as number, row.currency as string),
      row.status as AccountStatus,
      new Date(row.created_at as string),
      new Date(row.updated_at as string)
    )
  }

  /**
   * Checks whether an account exists in the database
   *
   * Lightweight existence check without loading full account data.
   * Used for validation before attempting operations on accounts.
   *
   * @param accountId - Account ID (UUID) to check
   * @returns Promise resolving to true if account exists, false otherwise
   * @throws Database error if query fails
   *
   * @example
   * ```typescript
   * const exists = await repository.existsById(accountId)
   * if (!exists) {
   *   throw new NotFoundError('Account does not exist')
   * }
   * ```
   */
  async existsById(accountId: string, trx?: any): Promise<boolean> {
    const queryBuilder = trx ? trx.table('accounts') : DB.table('accounts')
    const row = (await queryBuilder.where('id', accountId).first()) as any
    return !!row
  }
}
