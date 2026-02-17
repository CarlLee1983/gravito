import type { Transaction } from './Transaction'

export interface ITransactionRepository {
  save(transaction: Transaction): Promise<void>
  findByAccountId(accountId: string, limit?: number, offset?: number): Promise<Transaction[]>
  countByAccountId(accountId: string): Promise<number>
}
