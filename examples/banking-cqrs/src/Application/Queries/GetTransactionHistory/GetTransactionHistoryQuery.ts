import type { Query } from '@gravito/enterprise'

export class GetTransactionHistoryQuery implements Query {
  constructor(
    readonly accountId: string,
    readonly limit: number = 10,
    readonly offset: number = 0
  ) {}
}
