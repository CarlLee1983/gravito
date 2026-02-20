import { Query, type QueryHandler } from '@gravito/enterprise'
import type {
  AccountReadModel,
  AccountRecord,
} from '../../infrastructure/projections/AccountReadModel'

export class GetAccountBalanceQuery extends Query {
  constructor(public readonly accountId: string) {
    super()
  }
}

export class GetAccountBalanceQueryHandler
  implements QueryHandler<GetAccountBalanceQuery, AccountRecord | null>
{
  constructor(private readonly accountReadModel: AccountReadModel) {}

  async handle(query: GetAccountBalanceQuery): Promise<AccountRecord | null> {
    return this.accountReadModel.findById(query.accountId)
  }
}
