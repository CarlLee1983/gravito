/**
 * Supported transaction types in the read model.
 */
export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'transfer_debit'
  | 'transfer_credit'
  | 'transfer_completed'
  | 'transfer_failed'

/**
 * Represents a single transaction entry in the read model history.
 */
export interface TransactionRecord {
  /** Unique identifier for the transaction record. */
  id: string
  /** Account ID involved in the transaction. */
  accountId: string
  /** Transaction type. */
  type: TransactionType
  /** Amount in cents. */
  amountCents: number
  /** When the transaction occurred. */
  timestamp: Date
  /** Associated transfer ID (if applicable). */
  transferId?: string
}

/**
 * Read model (Projection) for transaction history.
 * Aggregates all account-related movements into a searchable history.
 */
export class TransactionReadModel {
  /** In-memory store mapping Account IDs to their respective transaction histories. */
  private readonly store = new Map<string, TransactionRecord[]>()

  /**
   * Appends a new transaction to an account's history.
   *
   * @param record - The transaction record to add.
   */
  addTransaction(record: TransactionRecord): void {
    const existing = this.store.get(record.accountId) ?? []
    this.store.set(record.accountId, [...existing, { ...record }])
  }

  /**
   * Retrieves the transaction history for an account, with pagination.
   * Records are returned in reverse-chronological order (newest first).
   *
   * @param accountId - The unique ID of the account.
   * @param limit - Maximum number of items to return.
   * @param offset - Starting index for pagination.
   * @returns An array of transaction records.
   */
  findByAccountId(accountId: string, limit = 20, offset = 0): TransactionRecord[] {
    const records = this.store.get(accountId) ?? []
    // Latest transactions first
    return [...records].reverse().slice(offset, offset + limit)
  }

  /**
   * Gets the total number of transactions recorded for a given account.
   *
   * @param accountId - The account ID to count transactions for.
   * @returns The transaction count.
   */
  countByAccountId(accountId: string): number {
    return (this.store.get(accountId) ?? []).length
  }
}
