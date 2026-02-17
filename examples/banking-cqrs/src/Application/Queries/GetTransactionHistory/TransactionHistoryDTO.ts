/**
 * Individual Transaction Data Transfer Object
 */
export interface TransactionDTO {
  /** Transaction unique ID */
  id: string
  /** Type of transaction (e.g., 'deposit', 'withdrawal') */
  type: string
  /** Amount in cents */
  amountCents: number
  /** Amount in dollars */
  amountDollars: number
  /** Historical balance in cents after this transaction */
  balanceAfterCents: number
  /** Historical balance in dollars after this transaction */
  balanceAfterDollars: number
  /** Currency code */
  currency: string
  /** Reference ID (e.g., counterparty account for transfers) */
  referenceId: string | null
  /** Human-readable description */
  description: string | null
  /** Transaction timestamp */
  createdAt: Date
}

/**
 * Transaction History Response DTO
 */
export interface TransactionHistoryDTO {
  /** Account identifier */
  accountId: string
  /** List of transactions found */
  transactions: TransactionDTO[]
  /** Total count for pagination */
  total: number
  /** Limit used for query */
  limit: number
  /** Offset used for query */
  offset: number
}
