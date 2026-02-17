import type { QueryHandler } from '@gravito/enterprise'
import type { IAccountRepository } from '../../../Domain/Account/IAccountRepository'
import type { AccountDetailsDTO } from './AccountDetailsDTO'
import type { GetAccountDetailsQuery } from './GetAccountDetailsQuery'

/**
 * Get Account Details Query Handler
 *
 * Retrieves the full state of an account as a DTO.
 *
 * @implements {QueryHandler<GetAccountDetailsQuery, AccountDetailsDTO>}
 * @since 1.0.0
 */
export class GetAccountDetailsHandler
  implements QueryHandler<GetAccountDetailsQuery, AccountDetailsDTO>
{
  /**
   * Constructor
   *
   * @param repository - Account repository
   */
  constructor(private repository: IAccountRepository) {}

  /**
   * Handles the request for account details
   *
   * @param query - Request parameters
   * @returns Account details DTO
   * @throws Error if account not found
   */
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
