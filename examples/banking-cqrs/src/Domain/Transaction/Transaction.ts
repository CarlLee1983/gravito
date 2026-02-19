import { TransactionType } from './TransactionType'

/**
 * Transaction Entity
 *
 * Represents a historical record of a financial operation performed on an account.
 * Transactions are immutable records used for auditing and displaying history.
 *
 * @since 1.0.0
 */
export class Transaction {
  /**
   * Constructor
   *
   * @param id - Unique transaction identifier
   * @param accountId - ID of the account this transaction belongs to
   * @param type - Type of transaction (DEPOSIT, WITHDRAWAL, etc.)
   * @param amount - Amount involved in cents
   * @param balanceAfter - Account balance in cents after this transaction
   * @param currency - Currency code
   * @param referenceId - Related entity ID (e.g., target account ID for transfers)
   * @param description - Human-readable description of the operation
   * @param createdAt - Timestamp of the transaction
   */
  constructor(
    readonly id: string,
    readonly accountId: string,
    readonly type: TransactionType,
    readonly amount: number,
    readonly balanceAfter: number,
    readonly currency: string,
    readonly referenceId: string | null,
    readonly description: string | null,
    readonly createdAt: Date = new Date()
  ) {}

  /**
   * Factory method for creating a deposit transaction record
   *
   * @param id - Transaction ID
   * @param accountId - Target account ID
   * @param amount - Amount in cents
   * @param balanceAfter - New balance in cents
   * @param currency - Currency code
   * @returns New Transaction instance
   */
  static deposit(
    id: string,
    accountId: string,
    amount: number,
    balanceAfter: number,
    currency: string
  ): Transaction {
    return new Transaction(
      id,
      accountId,
      TransactionType.DEPOSIT,
      amount,
      balanceAfter,
      currency,
      null,
      '存款',
      new Date()
    )
  }

  /**
   * Factory method for creating a withdrawal transaction record
   *
   * @param id - Transaction ID
   * @param accountId - Source account ID
   * @param amount - Amount in cents
   * @param balanceAfter - New balance in cents
   * @param currency - Currency code
   * @returns New Transaction instance
   */
  static withdrawal(
    id: string,
    accountId: string,
    amount: number,
    balanceAfter: number,
    currency: string
  ): Transaction {
    return new Transaction(
      id,
      accountId,
      TransactionType.WITHDRAWAL,
      amount,
      balanceAfter,
      currency,
      null,
      '提款',
      new Date()
    )
  }

  /**
   * Factory method for creating a transfer transaction record
   *
   * @param id - Transaction ID
   * @param accountId - Own account ID
   * @param toAccountId - Counterparty account ID
   * @param amount - Amount in cents
   * @param balanceAfter - New balance in cents
   * @param currency - Currency code
   * @param isOutgoing - True if sending funds, false if receiving
   * @returns New Transaction instance
   */
  static transfer(
    id: string,
    accountId: string,
    toAccountId: string,
    amount: number,
    balanceAfter: number,
    currency: string,
    isOutgoing: boolean
  ): Transaction {
    return new Transaction(
      id,
      accountId,
      isOutgoing ? TransactionType.TRANSFER_OUT : TransactionType.TRANSFER_IN,
      amount,
      balanceAfter,
      currency,
      toAccountId,
      isOutgoing ? `轉帳給 ${toAccountId}` : `轉帳自 ${toAccountId}`,
      new Date()
    )
  }

  /**
   * Generic factory method for creating a transaction
   *
   * @param id - Transaction ID
   * @param accountId - Account ID
   * @param type - Transaction type ('deposit', 'withdrawal', 'transfer_out', 'transfer_in')
   * @param amount - Amount in cents
   * @param balanceAfter - New balance in cents
   * @param currency - Currency code
   * @param referenceId - Optional reference ID
   * @param description - Optional description
   * @returns New Transaction instance
   */
  static create(
    id: string,
    accountId: string,
    type: TransactionType | string,
    amount: number,
    balanceAfter: number,
    currency: string,
    referenceId?: string | null,
    description?: string | null
  ): Transaction {
    return new Transaction(
      id,
      accountId,
      type as TransactionType,
      amount,
      balanceAfter,
      currency,
      referenceId ?? null,
      description ?? null,
      new Date()
    )
  }
}
