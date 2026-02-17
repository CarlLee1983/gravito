import { DB } from '@gravito/atlas'
import type { ITransactionRepository } from '../../Domain/Transaction/ITransactionRepository'
import { Transaction } from '../../Domain/Transaction/Transaction'
import type { TransactionType } from '../../Domain/Transaction/TransactionType'

export class AtlasTransactionRepository implements ITransactionRepository {
  async save(transaction: Transaction): Promise<void> {
    await DB.table('transactions').insert({
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
    const rows = (await DB.table('transactions')
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

  async countByAccountId(accountId: string): Promise<number> {
    const result = (await DB.table('transactions')
      .where('account_id', accountId)
      .count('* as count')
      .first()) as any
    return result?.count ?? 0
  }
}
