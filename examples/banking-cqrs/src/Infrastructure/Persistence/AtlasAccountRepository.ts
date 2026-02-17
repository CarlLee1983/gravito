import { DB } from '@gravito/atlas'
import { Account } from '../../Domain/Account/Account'
import type { AccountStatus } from '../../Domain/Account/AccountStatus'
import type { IAccountRepository } from '../../Domain/Account/IAccountRepository'
import { Money } from '../../Domain/Shared/Money'

export class AtlasAccountRepository implements IAccountRepository {
  async save(account: Account): Promise<void> {
    const existing = (await DB.table('accounts').where('id', account.id).first()) as any

    if (existing) {
      await DB.table('accounts').where('id', account.id).update({
        balance: account.balance.cents,
        status: account.status,
        updated_at: new Date().toISOString(),
      })
    } else {
      await DB.table('accounts').insert({
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
    const row = (await DB.table('accounts').where('id', accountId).first()) as any

    if (!row) return null

    return new Account(
      row.id as string,
      row.owner_name as string,
      new Money(row.balance as number, row.currency as string),
      row.status as AccountStatus,
      new Date(row.created_at as string),
      new Date(row.updated_at as string)
    )
  }

  async existsById(accountId: string): Promise<boolean> {
    const row = (await DB.table('accounts').where('id', accountId).first()) as any
    return !!row
  }
}
