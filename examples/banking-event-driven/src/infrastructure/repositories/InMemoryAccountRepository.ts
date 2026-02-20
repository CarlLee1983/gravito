import type { Account } from '../../domain/account/Account'
import type { IAccountRepository } from './IAccountRepository'

export class InMemoryAccountRepository implements IAccountRepository {
  private readonly store = new Map<string, Account>()

  async save(account: Account): Promise<void> {
    this.store.set(account.id, account)
  }

  async findById(id: string): Promise<Account | null> {
    return this.store.get(id) ?? null
  }

  async findAll(): Promise<Account[]> {
    return Array.from(this.store.values())
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id)
  }
}
