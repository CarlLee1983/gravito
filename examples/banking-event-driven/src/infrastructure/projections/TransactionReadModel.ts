export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'transfer_debit'
  | 'transfer_credit'
  | 'transfer_completed'
  | 'transfer_failed'

export interface TransactionRecord {
  id: string
  accountId: string
  type: TransactionType
  amountCents: number
  timestamp: Date
  transferId?: string
}

export class TransactionReadModel {
  private readonly store = new Map<string, TransactionRecord[]>()

  addTransaction(record: TransactionRecord): void {
    const existing = this.store.get(record.accountId) ?? []
    this.store.set(record.accountId, [...existing, { ...record }])
  }

  findByAccountId(accountId: string, limit = 20, offset = 0): TransactionRecord[] {
    const records = this.store.get(accountId) ?? []
    // 最新的交易在最前面
    return [...records].reverse().slice(offset, offset + limit)
  }

  countByAccountId(accountId: string): number {
    return (this.store.get(accountId) ?? []).length
  }
}
