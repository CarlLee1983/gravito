import type { QueryHandler } from '@gravito/enterprise'
import type { IAccountRepository } from '../../../Domain/Account/IAccountRepository'
import type { AccountBalanceDTO } from './AccountBalanceDTO'
import type { GetAccountBalanceQuery } from './GetAccountBalanceQuery'

export class GetAccountBalanceHandler
  implements QueryHandler<GetAccountBalanceQuery, AccountBalanceDTO>
{
  constructor(private repository: IAccountRepository) {}

  async handle(query: GetAccountBalanceQuery): Promise<AccountBalanceDTO> {
    const account = await this.repository.findById(query.accountId)
    if (!account) {
      throw new Error(`帳戶 ${query.accountId} 不存在`)
    }

    return {
      accountId: account.id,
      ownerName: account.ownerName,
      balanceCents: account.balance.cents,
      balanceDollars: account.balance.dollars,
      currency: account.balance.currency,
      status: account.status,
      createdAt: account.createdAt,
    }
  }
}
