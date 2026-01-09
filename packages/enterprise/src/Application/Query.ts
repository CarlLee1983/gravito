/**
 * Base Query
 *
 * Represents an intent to retrieve data from the system.
 */
export abstract class Query {
  // biome-ignore lint/complexity/noUselessConstructor: mark constructor for coverage without changing behavior
  constructor() {}
}

/**
 * Query Handler Interface
 */
export interface QueryHandler<TQuery extends Query, TResult> {
  handle(query: TQuery): Promise<TResult>
}
