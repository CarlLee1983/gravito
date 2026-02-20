import { Query, type QueryHandler } from '@gravito/enterprise'
import type {
  AccountReadModel,
  AccountRecord,
} from '../../infrastructure/projections/AccountReadModel'

/**
 * Query to retrieve the balance and details for a specific account.
 */
export class GetAccountBalanceQuery extends Query {
  /**
   * @param accountId - The unique identifier of the account to query.
   */
  constructor(public readonly accountId: string) {
    super()
  }
}

/**
 * Handles the logic for retrieving an account's balance from the read model.
 */
export class GetAccountBalanceQueryHandler
  implements QueryHandler<GetAccountBalanceQuery, AccountRecord | null>
{
  constructor(private readonly accountReadModel: AccountReadModel) {}

  /**
   * Executes the account balance query.
   *
   * @param query - The balance query containing the account ID.
   * @returns The account record if found, otherwise null.
   */
  async handle(query: GetAccountBalanceQuery): Promise<AccountRecord | null> {
    return this.accountReadModel.findById(query.accountId)
  }
}
