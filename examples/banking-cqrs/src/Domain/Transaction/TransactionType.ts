/**
 * Transaction Type Enum
 *
 * Categorizes the type of financial operation recorded in the transaction history.
 *
 * @since 1.0.0
 */
export enum TransactionType {
  /** Funds added to account */
  DEPOSIT = 'deposit',
  /** Funds removed from account */
  WITHDRAWAL = 'withdrawal',
  /** Funds sent to another account */
  TRANSFER_OUT = 'transfer_out',
  /** Funds received from another account */
  TRANSFER_IN = 'transfer_in',
}
