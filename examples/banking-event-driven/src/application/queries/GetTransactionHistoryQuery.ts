import { Query, type QueryHandler } from '@gravito/enterprise'
import type {
  TransactionReadModel,
  TransactionRecord,
} from '../../infrastructure/projections/TransactionReadModel'

export class GetTransactionHistoryQuery extends Query {
  constructor(
    public readonly accountId: string,
    public readonly limit = 20,
    public readonly offset = 0
  ) {
    super()
  }
}

export class GetTransactionHistoryQueryHandler
  implements QueryHandler<GetTransactionHistoryQuery, TransactionRecord[]>
{
  constructor(private readonly transactionReadModel: TransactionReadModel) {}

  async handle(query: GetTransactionHistoryQuery): Promise<TransactionRecord[]> {
    return this.transactionReadModel.findByAccountId(query.accountId, query.limit, query.offset)
  }
}
