import { Query, type QueryHandler } from '@gravito/enterprise'
import type {
  AccountReadModel,
  AccountRecord,
} from '../../infrastructure/projections/AccountReadModel'

export interface PaginatedResult<T> {
  data: T[]
  total: number
  limit: number
  offset: number
}

export class GetAllAccountsQuery extends Query {
  constructor(
    public readonly limit = 20,
    public readonly offset = 0
  ) {
    super()
  }
}

export class GetAllAccountsQueryHandler
  implements QueryHandler<GetAllAccountsQuery, PaginatedResult<AccountRecord>>
{
  constructor(private readonly accountReadModel: AccountReadModel) {}

  async handle(query: GetAllAccountsQuery): Promise<PaginatedResult<AccountRecord>> {
    const data = this.accountReadModel.findAll(query.limit, query.offset)
    const total = this.accountReadModel.count()

    return {
      data,
      total,
      limit: query.limit,
      offset: query.offset,
    }
  }
}
