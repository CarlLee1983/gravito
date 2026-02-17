export interface TransactionDTO {
  id: string
  type: string
  amountCents: number
  amountDollars: number
  balanceAfterCents: number
  balanceAfterDollars: number
  currency: string
  referenceId: string | null
  description: string | null
  createdAt: Date
}

export interface TransactionHistoryDTO {
  accountId: string
  transactions: TransactionDTO[]
  total: number
  limit: number
  offset: number
}
