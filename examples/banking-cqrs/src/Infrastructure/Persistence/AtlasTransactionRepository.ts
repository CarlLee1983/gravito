import { DB } from '@gravito/atlas'
import type { ITransactionRepository } from '../../Domain/Transaction/ITransactionRepository'
import { Transaction } from '../../Domain/Transaction/Transaction'
import type { TransactionType } from '../../Domain/Transaction/TransactionType'

/**
 * Transaction Repository Implementation using Atlas ORM
 *
 * Provides persistence layer for Transaction entities (immutable audit records).
 * Transactions represent all account activities and serve as event log entries.
 *
 * **Key Characteristics:**
 * - Transactions are **immutable** (only created, never updated or deleted)
 * - Designed for event sourcing - each transaction is created when domain events occur
 * - Supports querying transaction history by account
 * - Enables audit trails and compliance reporting
 *
 * **Database Schema (SQLite):**
 * ```sql
 * CREATE TABLE transactions (
 *   id TEXT PRIMARY KEY,
 *   account_id TEXT NOT NULL,
 *   type TEXT NOT NULL,              -- 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out'
 *   amount INTEGER NOT NULL,         -- stored in cents
 *   balance_after INTEGER NOT NULL,  -- balance after transaction (in cents)
 *   currency TEXT NOT NULL DEFAULT 'TWD',
 *   reference_id TEXT,               -- for transfers, the other account's ID
 *   description TEXT,
 *   created_at TEXT NOT NULL,
 *   FOREIGN KEY (account_id) REFERENCES accounts(id)
 * )
 * ```
 *
 * **Indexes for Performance:**
 * - idx_transactions_account_id - for querying by account
 * - idx_transactions_created_at - for time-range queries
 *
 * **Implementation Notes:**
 * - Transactions are created (not updated) during command execution
 * - Amount is stored as integer (cents) for precision
 * - Supports pagination for history queries
 *
 * @implements {ITransactionRepository}
 *
 * @example
 * ```typescript
 * const repository = new AtlasTransactionRepository()
 *
 * // Create transaction (when deposit occurs)
 * const transaction = new Transaction(
 *   id, accountId, 'deposit', 10000, 10000, 'TWD'
 * )
 * await repository.save(transaction)
 *
 * // Query history
 * const transactions = await repository.findByAccountId(accountId, 10, 0)
 * console.log(transactions[0].amountCents)  // 10000
 * ```
 *
 * @since 1.0.0
 */
export class AtlasTransactionRepository implements ITransactionRepository {
  /**
   * Creates (inserts) a new immutable transaction record
   *
   * Transactions are created when domain events occur (deposit, withdrawal, transfer).
   * They form the audit trail and event log for the account.
   *
   * **Preconditions:**
   * - Transaction.id must be unique (UUID)
   * - Account must exist (enforced by foreign key constraint)
   * - Amount must be positive (non-negative for balance checks)
   *
   * **Data Mapping:**
   * - Amounts stored as integers (cents) for precision
   * - Timestamps converted to ISO string format
   * - reference_id nullable for transfers (points to counterparty account)
   * - description nullable for optional audit notes
   *
   * @param transaction - Transaction entity to persist
   * @throws Database error if insert fails (FK constraint, etc.)
   *
   * @example
   * ```typescript
   * const txn = new Transaction(
   *   id,
   *   accountId,
   *   'deposit',
   *   50000,  // 500.00 TWD
   *   150000, // new balance 1500.00 TWD
   *   'TWD'
   * )
   * await repository.save(txn)
   * ```
   */
  async save(transaction: Transaction, trx?: any): Promise<void> {
    // Use transaction if provided, otherwise use DB directly
    const queryBuilder = trx ? trx.table('transactions') : DB.table('transactions')

    await queryBuilder.insert({
      id: transaction.id,
      account_id: transaction.accountId,
      type: transaction.type,
      amount: transaction.amount,
      balance_after: transaction.balanceAfter,
      reference_id: transaction.referenceId,
      description: transaction.description,
      currency: transaction.currency,
      created_at: transaction.createdAt.toISOString(),
    })
  }

  /**
   * Queries transaction history for an account with pagination
   *
   * Returns transactions in reverse chronological order (newest first).
   * Supports pagination for large transaction histories.
   *
   * **Performance:**
   * - Uses index on (account_id, created_at) for fast queries
   * - LIMIT and OFFSET for pagination
   * - Suitable for rendering transaction lists in UI
   *
   * **Pagination Guide:**
   * - limit: number of records per page (default: 10)
   * - offset: number of records to skip (default: 0)
   * - For page 2 with 10 items/page: `findByAccountId(id, 10, 10)`
   *
   * @param accountId - Account ID to query transactions for
   * @param limit - Maximum records to return (default: 10)
   * @param offset - Number of records to skip (default: 0)
   * @returns Promise resolving to Transaction array, newest first
   * @throws Database error if query fails
   *
   * @example
   * ```typescript
   * // Get recent 10 transactions
   * const recent = await repository.findByAccountId(accountId, 10, 0)
   *
   * // Get next page (offset by 10)
   * const page2 = await repository.findByAccountId(accountId, 10, 10)
   *
   * // Build transaction history with all records
   * const all = await repository.findByAccountId(accountId, 1000000, 0)
   * ```
   */
  async findByAccountId(
    accountId: string,
    limit = 10,
    offset = 0,
    trx?: any
  ): Promise<Transaction[]> {
    const queryBuilder = trx ? trx.table('transactions') : DB.table('transactions')

    const rows = (await queryBuilder
      .where('account_id', accountId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)) as any[]

    return rows.map(
      (row) =>
        new Transaction(
          row.id as string,
          row.account_id as string,
          row.type as TransactionType,
          row.amount as number,
          row.balance_after as number,
          row.currency as string,
          row.reference_id as string | null,
          row.description as string | null,
          new Date(row.created_at as string)
        )
    )
  }

  /**
   * Counts total transactions for an account
   *
   * Used to determine pagination total and statistics.
   * Efficient aggregation query.
   *
   * @param accountId - Account ID to count transactions for
   * @returns Promise resolving to total transaction count
   * @throws Database error if query fails
   *
   * @example
   * ```typescript
   * const total = await repository.countByAccountId(accountId)
   * const pages = Math.ceil(total / 10)
   * console.log(`Total ${total} transactions, ${pages} pages`)
   * ```
   */
  async countByAccountId(accountId: string, trx?: any): Promise<number> {
    const queryBuilder = trx ? trx.table('transactions') : DB.table('transactions')

    const result = (await queryBuilder
      .where('account_id', accountId)
      .count('* as count')
      .first()) as any
    return result?.count ?? 0
  }
}
