import { Query, type QueryHandler } from '@gravito/enterprise'
import type {
  AccountReadModel,
  AccountRecord,
} from '../../infrastructure/projections/AccountReadModel'

/**
 * Generic interface for paginated query results.
 */
export interface PaginatedResult<T> {
  /** The data being returned for the current page. */
  data: T[]
  /** Total number of records available across all pages. */
  total: number
  /** The maximum number of items per page. */
  limit: number
  /** The starting offset for pagination. */
  offset: number
}

/**
 * Query to retrieve all accounts with pagination support.
 */
export class GetAllAccountsQuery extends Query {
  /**
   * @param limit - Maximum number of items to return (default: 20).
   * @param offset - The starting position (default: 0).
   */
  constructor(
    public readonly limit = 20,
    public readonly offset = 0
  ) {
    super()
  }
}

/**
 * Handles the logic for retrieving all accounts with pagination from the read model.
 */
export class GetAllAccountsQueryHandler
  implements QueryHandler<GetAllAccountsQuery, PaginatedResult<AccountRecord>>
{
  constructor(private readonly accountReadModel: AccountReadModel) {}

  /**
   * Executes the query for all accounts.
   *
   * @param query - The query object with limit and offset.
   * @returns A paginated result containing account records.
   */
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
