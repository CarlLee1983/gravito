import type { Container } from '@gravito/core'
import type { Query, QueryHandler } from '@gravito/enterprise'

export class QueryBus {
  constructor(private container: Container) {}

  async execute<TResult>(query: Query): Promise<TResult> {
    const handlerKey = `cqrs.query.${query.constructor.name}`
    const handler = this.container.make<QueryHandler<Query, TResult>>(handlerKey)
    return handler.handle(query)
  }
}
