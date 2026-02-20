/**
 * Represents a flattened view of an account, optimized for read operations.
 */
export interface AccountRecord {
  /** Unique identifier for the account. */
  id: string
  /** Name of the account owner. */
  ownerName: string
  /** Current balance in cents. */
  balanceCents: number
  /** Current operational status of the account. */
  status: 'active' | 'frozen'
  /** Currency code (e.g., TWD, USD). */
  currency: string
  /** Date when the account was initially opened. */
  createdAt: Date
}

/**
 * Read model (Projection) for account data.
 * Provides fast, specialized data structures for query operations.
 */
export class AccountReadModel {
  /** In-memory store using a Map for O(1) lookups. */
  private readonly store = new Map<string, AccountRecord>()

  /**
   * Adds a new account record to the projection.
   *
   * @param record - The account record to store.
   */
  addAccount(record: AccountRecord): void {
    this.store.set(record.id, { ...record })
  }

  /**
   * Updates the balance for an existing account record.
   *
   * @param id - The account ID.
   * @param balanceCents - The new balance in cents.
   */
  updateBalance(id: string, balanceCents: number): void {
    const existing = this.store.get(id)
    if (existing) {
      this.store.set(id, { ...existing, balanceCents })
    }
  }

  /**
   * Updates the status for an existing account record.
   *
   * @param id - The account ID.
   * @param status - The new status ('active' or 'frozen').
   */
  updateStatus(id: string, status: 'active' | 'frozen'): void {
    const existing = this.store.get(id)
    if (existing) {
      this.store.set(id, { ...existing, status })
    }
  }

  /**
   * Finds an account record by its unique identifier.
   *
   * @param id - The account ID.
   * @returns The record if found, otherwise null.
   */
  findById(id: string): AccountRecord | null {
    return this.store.get(id) ?? null
  }

  /**
   * Retrieves all account records with pagination support.
   *
   * @param limit - Maximum number of records to return.
   * @param offset - Starting index for pagination.
   * @returns An array of account records.
   */
  findAll(limit = 20, offset = 0): AccountRecord[] {
    const all = Array.from(this.store.values())
    return all.slice(offset, offset + limit)
  }

  /**
   * Gets the total count of accounts in the store.
   *
   * @returns The total number of accounts.
   */
  count(): number {
    return this.store.size
  }
}
