import type { Query } from '@gravito/enterprise'

export class GetAccountDetailsQuery implements Query {
  constructor(readonly accountId: string) {}
}
