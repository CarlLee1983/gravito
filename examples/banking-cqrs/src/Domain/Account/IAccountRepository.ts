import type { Account } from './Account'

export interface IAccountRepository {
  save(account: Account): Promise<void>
  findById(accountId: string): Promise<Account | null>
  existsById(accountId: string): Promise<boolean>
}
