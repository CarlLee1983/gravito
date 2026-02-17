import type { QueryHandler } from '@gravito/enterprise'
import type { IAccountRepository } from '../../../Domain/Account/IAccountRepository'
import type { AccountDetailsDTO } from './AccountDetailsDTO'
import type { GetAccountDetailsQuery } from './GetAccountDetailsQuery'

export class GetAccountDetailsHandler
  implements QueryHandler<GetAccountDetailsQuery, AccountDetailsDTO>
{
  constructor(private repository: IAccountRepository) {}

  async handle(query: GetAccountDetailsQuery): Promise<AccountDetailsDTO> {
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
      updatedAt: account.updatedAt,
    }
  }
}
