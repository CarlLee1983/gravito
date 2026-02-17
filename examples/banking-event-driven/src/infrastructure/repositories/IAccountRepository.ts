import type { Account } from '../../domain/account/Account'

export interface IAccountRepository {
  save(account: Account): Promise<void>
  findById(id: string): Promise<Account | null>
  findAll(): Promise<Account[]>
  delete(id: string): Promise<void>
}
