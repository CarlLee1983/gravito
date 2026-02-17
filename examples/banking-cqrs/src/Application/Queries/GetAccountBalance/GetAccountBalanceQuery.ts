import type { Query } from '@gravito/enterprise'

export class GetAccountBalanceQuery implements Query {
  constructor(readonly accountId: string) {}
}
