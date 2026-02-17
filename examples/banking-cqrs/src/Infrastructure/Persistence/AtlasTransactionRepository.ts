import { DB } from '@gravito/atlas'
import type { ITransactionRepository } from '../../Domain/Transaction/ITransactionRepository'
import { Transaction } from '../../Domain/Transaction/Transaction'
import type { TransactionType } from '../../Domain/Transaction/TransactionType'

export class AtlasTransactionRepository implements ITransactionRepository {
  async save(transaction: Transaction): Promise<void> {
    await DB.query('transactions').insert({
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

  async findByAccountId(accountId: string, limit = 10, offset = 0): Promise<Transaction[]> {
    const rows = await DB.query('transactions')
      .where('account_id', accountId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)

    return rows.map(
      (row: any) =>
        new Transaction(
          row.id,
          row.account_id,
          row.type as TransactionType,
          row.amount,
          row.balance_after,
          row.currency,
          row.reference_id,
          row.description,
          new Date(row.created_at)
        )
    )
  }

  async countByAccountId(accountId: string): Promise<number> {
    const result = await DB.query('transactions')
      .where('account_id', accountId)
      .count('* as count')
      .first()
    return result?.count ?? 0
  }
}
