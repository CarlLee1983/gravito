import type { Database } from '@gravito/atlas'
import { Account } from '../../Domain/Account/Account'
import type { AccountStatus } from '../../Domain/Account/AccountStatus'
import type { IAccountRepository } from '../../Domain/Account/IAccountRepository'
import { Money } from '../../Domain/Shared/Money'

export class AtlasAccountRepository implements IAccountRepository {
  constructor(private db: Database) {}

  async save(account: Account): Promise<void> {
    const existing = await this.db.query('accounts').where('id', account.id).first()

    if (existing) {
      await this.db.query('accounts').where('id', account.id).update({
        balance: account.balance.cents,
        status: account.status,
        updated_at: new Date().toISOString(),
      })
    } else {
      await this.db.query('accounts').insert({
        id: account.id,
        owner_name: account.ownerName,
        balance: account.balance.cents,
        currency: account.balance.currency,
        status: account.status,
        created_at: account.createdAt.toISOString(),
        updated_at: account.updatedAt.toISOString(),
      })
    }
  }

  async findById(accountId: string): Promise<Account | null> {
    const row = await this.db.query('accounts').where('id', accountId).first()

    if (!row) return null

    return new Account(
      row.id,
      row.owner_name,
      new Money(row.balance, row.currency),
      row.status as AccountStatus,
      new Date(row.created_at),
      new Date(row.updated_at)
    )
  }

  async existsById(accountId: string): Promise<boolean> {
    const row = await this.db.query('accounts').where('id', accountId).first()
    return !!row
  }
}
